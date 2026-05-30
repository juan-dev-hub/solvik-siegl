import { createClient } from '@supabase/supabase-js'
import { Keypair, PublicKey } from '@solana/web3.js'
import { verifyUSDCPayment } from '../solana'
import { getConnection } from '../solana/connection'
import { registerIssuer } from '../contract'
import { executeUSDCSplit } from './execute-split'
import { calculateFirstPaymentSplit, calculateRenewalSplit, PLAN_STORAGE, PLAN_PRICES_USDC } from './splits'
import { getShadowQuote, executeSwapAndBuildTx } from '../storage/provision'
import { solRefillNeeded, refillGasIfNeeded } from '../solana/ensure-gas'
import { buildRenewalDelegateTx, executeRenewal } from './subscription'

export { calculateFirstPaymentSplit, calculateRenewalSplit, PLAN_STORAGE, PLAN_PRICES_USDC }
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
): Promise<{ ok: boolean; error?: string; shadowSetupTx?: string; renewalDelegateTx?: string }> {
  const planPrice = PLAN_PRICES_USDC[planId]
  if (!planPrice) return { ok: false, error: 'Plan inválido.' }

  const owner = process.env.OWNER_WALLET ?? process.env.NEXT_PUBLIC_OWNER_WALLET
  const { valid, actualAmount } = await verifyUSDCPayment(txHash, owner!, planPrice)
  if (!valid) return { ok: false, error: 'Pago no verificado.' }

  const supabase    = getSupabase()
  const connection  = getConnection()

  const [configResult, existingResult] = await Promise.all([
    supabase.from('system_config').select('key, value'),
    supabase.from('issuers').select('registered_at').eq('wallet_address', walletAddress).single(),
  ])

  const contractActive = configResult.data?.find(c => c.key === 'contract_active')?.value === 'true'
  const isNewIssuer    = !existingResult.data

  if (!contractActive) {
    if (isNewIssuer) {
      const split = calculateFirstPaymentSplit(actualAmount)

      // ── Gas check: run before any on-chain ops ─────────────────────────────
      const shadowWalletPubkey  = new PublicKey(process.env.SHADOW_WALLET!)
      const feePoolWalletPubkey = new PublicKey(process.env.FEE_POOL_WALLET!)

      const [shadowRefill, feePoolRefill] = await Promise.all([
        solRefillNeeded(shadowWalletPubkey,  connection),
        solRefillNeeded(feePoolWalletPubkey, connection),
      ])
      const totalRefill = shadowRefill + feePoolRefill

      // Deduct refill USDC from gas allocation (FEE_POOL priority)
      let gasAmount = split.gas_amount - totalRefill
      if (gasAmount < 0n) gasAmount = 0n

      // ── ExactOut quote for Shadow Drive ───────────────────────────────────
      const { shdwLamports, usdcNeeded, quoteResponse } = await getShadowQuote(planId)

      let shadowAmount = split.shadow_amount
      if (usdcNeeded > shadowAmount) {
        const overflow = usdcNeeded - shadowAmount
        shadowAmount = usdcNeeded
        gasAmount    = gasAmount - overflow
        if (gasAmount < 0n) throw new Error('Insufficient funds to cover Shadow Drive swap cost')
      }

      // ── Execute split (wallets receive their USDC) ────────────────────────
      await executeUSDCSplit([
        { recipient: process.env.FEE_POOL_WALLET!, amount: gasAmount + feePoolRefill },
        { recipient: process.env.SHADOW_WALLET!,  amount: shadowAmount + shadowRefill },
        { recipient: process.env.CONTRACT_WALLET!, amount: split.contract_amount },
      ])

      // ── Refill SOL gas for both wallets if needed ─────────────────────────
      const shadowSecret   = JSON.parse(process.env.SHADOW_WALLET_SECRET!)  as number[]
      const feePoolSecret  = JSON.parse(process.env.FEE_POOL_WALLET_SECRET!) as number[]
      const shadowKeypair  = Keypair.fromSecretKey(Uint8Array.from(shadowSecret))
      const feePoolKeypair = Keypair.fromSecretKey(Uint8Array.from(feePoolSecret))

      await Promise.all([
        shadowRefill  > 0n ? refillGasIfNeeded(shadowKeypair,  connection) : Promise.resolve(),
        feePoolRefill > 0n ? refillGasIfNeeded(feePoolKeypair, connection) : Promise.resolve(),
      ])

      // ── Shadow Drive: swap USDC→SHDW, fund user ATA, build setup tx ───────
      const shadowSetupTx = await executeSwapAndBuildTx(walletAddress, shdwLamports, quoteResponse)

      const renewalDelegateTx = await buildRenewalDelegateTx(walletAddress, planId)
      const renewalDate = new Date()
      renewalDate.setDate(renewalDate.getDate() + 30)

      await registerIssuer(walletAddress, planId)
      await supabase.from('issuers').insert({
        wallet_address:      walletAddress,
        institution_name:    'Sin nombre',
        slug:                walletAddress.slice(0, 8).toLowerCase(),
        storage_limit_bytes: PLAN_STORAGE[planId],
        plan:                planId,
        plan_expires_at:     renewalDate.toISOString(),
        auto_renew:          true,
      })

      return { ok: true, shadowSetupTx, renewalDelegateTx }
    }

    // ── Renewal ───────────────────────────────────────────────────────────────
    const split = calculateRenewalSplit(actualAmount)
    await executeUSDCSplit([
      { recipient: process.env.FEE_POOL_WALLET!, amount: split.gas_amount      },
      { recipient: process.env.CONTRACT_WALLET!, amount: split.contract_amount },
    ])
  }

  if (!isNewIssuer) {
    const nextRenewal = new Date()
    nextRenewal.setDate(nextRenewal.getDate() + 30)
    await supabase
      .from('issuers')
      .update({ storage_limit_bytes: PLAN_STORAGE[planId], plan: planId, plan_expires_at: nextRenewal.toISOString() })
      .eq('wallet_address', walletAddress)
  }

  return { ok: true }
}
