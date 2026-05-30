import { createClient } from '@supabase/supabase-js'
import { Keypair, PublicKey } from '@solana/web3.js'
import { verifyUSDCPayment } from '../solana'
import { getConnection } from '../solana/connection'
import { registerIssuer } from '../contract'
import { executeUSDCSplit } from './execute-split'
import { calculateFirstPaymentSplit, calculateRenewalSplit, PLAN_STORAGE, PLAN_PRICES_USDC } from './splits'
import { getShadowQuote, executeSwapAndBuildTx } from '../storage/provision'
import { solRefillNeeded, refillGasIfNeeded } from '../solana/ensure-gas'
import { swapGasUsdcToSol, createMerkleTreeForUser } from '../cnft/create-tree'

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
): Promise<{ ok: boolean; error?: string; shadowSetupTx?: string }> {
  const planPrice = PLAN_PRICES_USDC[planId]
  if (!planPrice) return { ok: false, error: 'Plan inválido.' }

  const owner = process.env.OWNER_WALLET ?? process.env.NEXT_PUBLIC_OWNER_WALLET
  const { valid, actualAmount } = await verifyUSDCPayment(txHash, owner!, planPrice)
  if (!valid) return { ok: false, error: 'Pago no verificado.' }

  const supabase   = getSupabase()
  const connection = getConnection()

  const [configResult, existingResult] = await Promise.all([
    supabase.from('system_config').select('key, value'),
    supabase.from('issuers').select('registered_at').eq('wallet_address', walletAddress).single(),
  ])

  const contractActive = configResult.data?.find(c => c.key === 'contract_active')?.value === 'true'
  const isNewIssuer    = !existingResult.data

  if (!contractActive) {
    if (isNewIssuer) {
      const split = calculateFirstPaymentSplit(actualAmount)

      // ── Gas check: SHADOW_WALLET only (FEE_POOL no longer centralized) ─────
      const shadowWalletPubkey = new PublicKey(process.env.SHADOW_WALLET!)
      const shadowRefill = await solRefillNeeded(shadowWalletPubkey, connection)

      // ── ExactOut quote for Shadow Drive ───────────────────────────────────
      const { shdwLamports, usdcNeeded, quoteResponse } = await getShadowQuote(planId)

      let shadowAmount = split.shadow_amount
      let gasAmount    = split.gas_amount - shadowRefill
      if (usdcNeeded > shadowAmount) {
        const overflow = usdcNeeded - shadowAmount
        shadowAmount = usdcNeeded
        gasAmount    = gasAmount - overflow
        if (gasAmount < 0n) throw new Error('Insufficient funds to cover Shadow Drive swap cost')
      }

      // ── Split: gas stays in OWNER_WALLET for tree creation ────────────────
      // Only SHADOW_WALLET and CONTRACT_WALLET receive USDC transfers
      await executeUSDCSplit([
        { recipient: process.env.SHADOW_WALLET!,   amount: shadowAmount + shadowRefill },
        { recipient: process.env.CONTRACT_WALLET!, amount: split.contract_amount },
      ])

      // ── Refill SHADOW_WALLET SOL if needed ────────────────────────────────
      if (shadowRefill > 0n) {
        const shadowSecret  = JSON.parse(process.env.SHADOW_WALLET_SECRET!) as number[]
        const shadowKeypair = Keypair.fromSecretKey(Uint8Array.from(shadowSecret))
        await refillGasIfNeeded(shadowKeypair, connection)
      }

      // ── Swap gas USDC → SOL in OWNER_WALLET, then create user's Merkle tree
      await swapGasUsdcToSol(gasAmount)
      const merkleTreeAddress = await createMerkleTreeForUser(planId)

      // ── Shadow Drive: swap USDC→SHDW, fund user ATA, build setup tx ───────
      const shadowSetupTx = await executeSwapAndBuildTx(walletAddress, shdwLamports, quoteResponse)

      await registerIssuer(walletAddress, planId)
      await supabase.from('issuers').insert({
        wallet_address:      walletAddress,
        institution_name:    'Sin nombre',
        slug:                walletAddress.slice(0, 8).toLowerCase(),
        storage_limit_bytes: PLAN_STORAGE[planId],
        merkle_tree_address: merkleTreeAddress,
      })

      return { ok: true, shadowSetupTx }
    }

    // ── Renewal: gas stays in OWNER_WALLET → swap to SOL for user's ongoing fees
    const split = calculateRenewalSplit(actualAmount)
    await executeUSDCSplit([
      { recipient: process.env.CONTRACT_WALLET!, amount: split.contract_amount },
    ])
    // Swap renewal gas USDC → SOL (funds future cNFT fees for this user)
    await swapGasUsdcToSol(split.gas_amount)
  }

  if (!isNewIssuer) {
    await supabase
      .from('issuers')
      .update({ storage_limit_bytes: PLAN_STORAGE[planId] })
      .eq('wallet_address', walletAddress)
  }

  return { ok: true }
}
