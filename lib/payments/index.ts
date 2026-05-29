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

  const [configResult, existingResult] = await Promise.all([
    supabase.from('system_config').select('key, value'),
    supabase.from('issuers').select('registered_at').eq('wallet_address', walletAddress).single(),
  ])

  const contractActive = configResult.data?.find(c => c.key === 'contract_active')?.value === 'true'
  const isNewIssuer = !existingResult.data

  if (!contractActive) {
    // Backend handles all splits until CONTRACT_WALLET accumulates enough for activation
    if (isNewIssuer) {
      const split = calculateFirstPaymentSplit(actualAmount)
      await executeUSDCSplit([
        { recipient: process.env.FEE_POOL_WALLET!,      amount: split.gas_amount },
        { recipient: process.env.SHADOW_WALLET!,   amount: split.shadow_amount },
        { recipient: process.env.CONTRACT_WALLET!, amount: split.contract_amount },
      ])
    } else {
      const split = calculateRenewalSplit(actualAmount)
      await executeUSDCSplit([
        { recipient: process.env.FEE_POOL_WALLET!,      amount: split.gas_amount },
        { recipient: process.env.CONTRACT_WALLET!, amount: split.contract_amount },
      ])
    }
  }
  // When contract is active it handles on-chain splits automatically — backend only updates records

  if (isNewIssuer) {
    await registerIssuer(walletAddress, planId)
    await supabase.from('issuers').insert({
      wallet_address: walletAddress,
      institution_name: 'Sin nombre',
      slug: walletAddress.slice(0, 8).toLowerCase(),
      storage_limit_bytes: PLAN_STORAGE[planId],
    })
  } else {
    await supabase
      .from('issuers')
      .update({ storage_limit_bytes: PLAN_STORAGE[planId] })
      .eq('wallet_address', walletAddress)
  }

  return { ok: true }
}
