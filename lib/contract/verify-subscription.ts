// Queries the Anchor program PDA to verify an issuer's subscription status.
// Falls back to Supabase storage_limit > 0 check until on-chain contract is live.
import { createClient } from '@supabase/supabase-js'

export type SubscriptionStatus = {
  is_active: boolean
  plan: string
  expires_at: number | null
}

export async function verifySubscription(walletAddress: string): Promise<SubscriptionStatus> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data } = await supabase
    .from('issuers')
    .select('storage_limit_bytes, registered_at')
    .eq('wallet_address', walletAddress)
    .single()

  if (!data || data.storage_limit_bytes <= 0) {
    return { is_active: false, plan: 'none', expires_at: null }
  }

  let plan = 'starter'
  if (data.storage_limit_bytes >= 21_474_836_480) plan = 'studio'
  else if (data.storage_limit_bytes >= 5_368_709_120) plan = 'pro'

  return { is_active: true, plan, expires_at: null }
}
