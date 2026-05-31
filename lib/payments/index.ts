// ─────────────────────────────────────────────────────────────────────────────
// PROCESO DE SUSCRIPCIÓN — Solvik Studio
//
// Flujo completo cuando un usuario paga su plan:
//   1. Verificar que la tx de USDC llegó a OWNER_WALLET con el monto correcto.
//   2. Calcular los splits según si es primer pago o renovación.
//   3. Verificar y recargar SOL de gas en SHADOW_WALLET y FEE_POOL_WALLET.
//   4. Ejecutar el split: transferir desde OWNER_WALLET hacia FEE_POOL, SHADOW y CONTRACT.
//   5. (Solo primer pago) Comprar SHDW con el 10%, crear bucket Shadow Drive
//      inmutable a nombre de la plataforma, guardar la pubkey en issuers.
//   6. Construir y retornar la tx de delegación de renovación para que el
//      usuario la firme (autoriza cobros automáticos futuros).
//
// CONTRATO ON-CHAIN (flag contract_active):
//   Cuando contract_active = true en system_config, el bloque de splits/Shadow
//   Drive se saltea completamente. Está pensado para cuando el programa Anchor
//   esté desplegado y maneje todo on-chain. Hoy ese bloque es un TODO vacío
//   — NO activar hasta que el programa esté implementado.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'
import { Keypair, PublicKey } from '@solana/web3.js'
import { verifyUSDCPayment } from '../solana'
import { getConnection } from '../solana/connection'
import { registerIssuer } from '../contract'
import { executeUSDCSplit } from './execute-split'
import { calculateFirstPaymentSplit, calculateRenewalSplit, PLAN_PRICES_USDC } from './splits'
import { getShadowQuote, executeSwapAndBuildTx } from '../storage/provision'
import { solRefillNeeded, refillGasIfNeeded } from '../solana/ensure-gas'
import { buildRenewalDelegateTx } from './subscription'

export { calculateFirstPaymentSplit, calculateRenewalSplit, PLAN_PRICES_USDC }
export { executeUSDCSplit }
export { calculateBookSplit } from './splits'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function processSubscription(
  walletAddress: string,
  planId: string,
  txHash: string
): Promise<{ ok: boolean; error?: string; renewalDelegateTx?: string }> {
  const planPrice = PLAN_PRICES_USDC[planId]
  if (!planPrice) return { ok: false, error: 'Plan inválido.' }

  // ── 1. Verificar pago ────────────────────────────────────────────────────────
  // Confirma que la tx on-chain transfirió exactamente planPrice USDC a OWNER_WALLET.
  // verifyUSDCPayment devuelve { valid, actualAmount } donde actualAmount puede
  // ser >= planPrice (ej: si el usuario pagó de más por error de slippage).
  const owner = process.env.OWNER_WALLET ?? process.env.NEXT_PUBLIC_OWNER_WALLET
  const { valid, actualAmount } = await verifyUSDCPayment(txHash, owner!, planPrice)
  if (!valid) return { ok: false, error: 'Pago no verificado.' }

  const supabase    = getSupabase()
  const connection  = getConnection()

  // ── 2. Cargar estado del sistema e issuer ────────────────────────────────────
  // Ambas queries en paralelo para no bloquear innecesariamente.
  const [configResult, existingResult] = await Promise.all([
    supabase.from('system_config').select('key, value'),
    supabase.from('issuers').select('registered_at').eq('wallet_address', walletAddress).single(),
  ])

  // contract_active: cuando sea true, el contrato Anchor maneja todo on-chain.
  // isNewIssuer: true → primer pago (setup completo), false → renovación.
  const contractActive = configResult.data?.find(c => c.key === 'contract_active')?.value === 'true'
  const isNewIssuer    = !existingResult.data

  if (!contractActive) {
    if (isNewIssuer) {
      // ── 3a. Primer pago: splits + Shadow Drive + registro ──────────────────

      const split = calculateFirstPaymentSplit(actualAmount)
      // split = { gas: 20%, shadow: 10%, contract: 10% }
      // OWNER_WALLET conserva el 60% restante sin transferencia explícita.

      // Verificar saldo de SOL en las wallets operativas antes de operar on-chain.
      // Si alguna está baja en SOL, refillNeeded devuelve los lamports que faltan
      // y se descuentan del gas allocation para comprarlos vía swap interno.
      const shadowWalletPubkey  = new PublicKey(process.env.SHADOW_WALLET!)
      const feePoolWalletPubkey = new PublicKey(process.env.FEE_POOL_WALLET!)

      const [shadowRefill, feePoolRefill] = await Promise.all([
        solRefillNeeded(shadowWalletPubkey,  connection),
        solRefillNeeded(feePoolWalletPubkey, connection),
      ])

      // Descuenta el costo de recarga del allocation de gas para FEE_POOL.
      // Si el refill supera el allocation, simplemente gas = 0 (no falla).
      let gasAmount = split.gas_amount - (shadowRefill + feePoolRefill)
      if (gasAmount < 0n) gasAmount = 0n

      // ── 4. Quote Shadow Drive ────────────────────────────────────────────────
      // Cotiza cuántos bytes de almacenamiento compra el 10% del pago en SHDW.
      // Se hace ANTES del split para saber el quoteResponse que se pasa al swap.
      const { shdwLamports, actualBytes, quoteResponse } = await getShadowQuote(split.shadow_amount)

      // ── 5. Ejecutar split on-chain ───────────────────────────────────────────
      // Una sola tx multi-transfer desde OWNER_WALLET firmada por OWNER_WALLET_SECRET.
      // Los montos incluyen el extra de recarga de SOL si aplica.
      await executeUSDCSplit([
        { recipient: process.env.FEE_POOL_WALLET!, amount: gasAmount + feePoolRefill },
        { recipient: process.env.SHADOW_WALLET!,  amount: split.shadow_amount + shadowRefill },
        { recipient: process.env.CONTRACT_WALLET!, amount: split.contract_amount },
      ])

      // Recargar SOL en wallets que lo necesiten (swap USDC→SOL interno).
      const shadowSecret   = JSON.parse(process.env.SHADOW_WALLET_SECRET!)  as number[]
      const feePoolSecret  = JSON.parse(process.env.FEE_POOL_WALLET_SECRET!) as number[]
      const shadowKeypair  = Keypair.fromSecretKey(Uint8Array.from(shadowSecret))
      const feePoolKeypair = Keypair.fromSecretKey(Uint8Array.from(feePoolSecret))

      await Promise.all([
        shadowRefill  > 0n ? refillGasIfNeeded(shadowKeypair,  connection) : Promise.resolve(),
        feePoolRefill > 0n ? refillGasIfNeeded(feePoolKeypair, connection) : Promise.resolve(),
      ])

      // ── 6. Shadow Drive ──────────────────────────────────────────────────────
      // Swap USDC→SHDW en SHADOW_WALLET, crea bucket a nombre de la plataforma,
      // lo hace inmutable (archivos permanentes), guarda la pubkey en la DB.
      // El usuario nunca firma nada de esto — todo ocurre en el backend.
      const { storageAccountPubkey } = await executeSwapAndBuildTx(walletAddress, shdwLamports, quoteResponse)

      // ── 7. Delegación de renovación ──────────────────────────────────────────
      // Tx sin firma que el usuario aprueba una vez desde el frontend.
      // Autoriza a OWNER_WALLET a debitar planPrice USDC por hasta 12 meses.
      const renewalDelegateTx = await buildRenewalDelegateTx(walletAddress, planId)

      const renewalDate = new Date()
      renewalDate.setDate(renewalDate.getDate() + 30)

      // Registro en contrato (TODO: instrucción Anchor cuando esté desplegado)
      await registerIssuer(walletAddress, planId)

      // Insertar en issuers con el bucket ya asignado
      await supabase.from('issuers').insert({
        wallet_address:        walletAddress,
        institution_name:      'Sin nombre',
        slug:                  walletAddress.slice(0, 8).toLowerCase(),
        storage_limit_bytes:   Number(actualBytes),
        plan:                  planId,
        plan_expires_at:       renewalDate.toISOString(),
        auto_renew:            true,
        shadow_account_pubkey: storageAccountPubkey,
      })

      return { ok: true, renewalDelegateTx }
    }

    // ── 3b. Renovación: splits sin Shadow Drive ──────────────────────────────
    // El bucket ya existe y es inmutable — no hace falta asignar más SHDW.
    // Gas y Contract reciben su porcentaje; Owner conserva el 60% restante.
    const split = calculateRenewalSplit(actualAmount)
    await executeUSDCSplit([
      { recipient: process.env.FEE_POOL_WALLET!, amount: split.gas_amount      },
      { recipient: process.env.CONTRACT_WALLET!, amount: split.contract_amount },
    ])
  }

  // ── 8. Actualizar fecha de vencimiento (renovaciones) ─────────────────────
  if (!isNewIssuer) {
    const nextRenewal = new Date()
    nextRenewal.setDate(nextRenewal.getDate() + 30)
    await supabase
      .from('issuers')
      .update({ plan: planId, plan_expires_at: nextRenewal.toISOString() })
      .eq('wallet_address', walletAddress)
  }

  return { ok: true }
}
