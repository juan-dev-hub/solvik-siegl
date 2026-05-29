import { createClient } from '@supabase/supabase-js'
import { verifyUSDCPayment } from '../solana'
import { registerIssuer } from '../contract'
import { executeUSDCSplit } from './execute-split'
import { calculateFirstPaymentSplit, calculateRenewalSplit, PLAN_STORAGE, PLAN_PRICES_USDC } from './splits'

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
): Promise<{ ok: boolean; error?: string }> {
  const planPrice = PLAN_PRICES_USDC[planId]
  if (!planPrice) return { ok: false, error: 'Plan inválido.' }

  const owner = process.env.OWNER_WALLET ?? process.env.NEXT_PUBLIC_OWNER_WALLET
  const { valid, actualAmount } = await verifyUSDCPayment(txHash, owner!, planPrice)
  if (!valid) return { ok: false, error: 'Pago no verificado.' }

  const supabase = getSupabase()
  const { data: existing } = await supabase
    .from('issuers')
    .select('registered_at')
    .eq('wallet_address', walletAddress)
    .single()

  const isFirstPayment = !existing

  if (isFirstPayment) {
    const split = calculateFirstPaymentSplit()
    await executeUSDCSplit([
      { recipient: process.env.CONTRACT_WALLET!, amount: split.contractAmount },
      { recipient: process.env.FEE_POOL_WALLET!, amount: split.feePoolTotal },
    ])
    await registerIssuer(walletAddress, planId)
    await supabase.from('issuers').insert({
      wallet_address: walletAddress,
      institution_name: 'Sin nombre',
      slug: walletAddress.slice(0, 8).toLowerCase(),
      storage_limit_bytes: PLAN_STORAGE[planId],
    })
  } else {
    // Renewal: contract handles split via Pyth. Backend only updates storage limit.
    const { fee_pool_amount } = calculateRenewalSplit(actualAmount)
    await executeUSDCSplit([
      { recipient: process.env.FEE_POOL_WALLET!, amount: fee_pool_amount },
    ])
    await supabase
      .from('issuers')
      .update({ storage_limit_bytes: PLAN_STORAGE[planId] })
      .eq('wallet_address', walletAddress)
  }

  return { ok: true }
}
