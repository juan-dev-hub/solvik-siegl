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
    .select('plan, plan_expires_at, storage_limit_bytes')
    .eq('wallet_address', walletAddress)
    .single()

  if (!data || !data.plan || data.storage_limit_bytes <= 0) {
    return { is_active: false, plan: 'none', expires_at: null }
  }

  const expiresAt = data.plan_expires_at ? new Date(data.plan_expires_at).getTime() : null
  const is_active = expiresAt ? expiresAt > Date.now() : true

  return { is_active, plan: data.plan, expires_at: expiresAt }
}
