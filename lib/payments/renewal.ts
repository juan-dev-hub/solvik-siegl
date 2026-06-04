import { createClient } from '@supabase/supabase-js'
import { calculateStorageForUsdc } from '@/lib/shadow/price'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function checkAndRenewStorage(walletAddress: string): Promise<{
  renewed: boolean
  storageLabel?: string
  message?: string
}> {
  const supabase = getSupabase()
  const { data: issuer } = await supabase
    .from('issuers')
    .select('renewal_reserve_usdc, storage_expires_at, storage_purchased_gb')
    .eq('wallet_address', walletAddress)
    .single()

  if (!issuer || !issuer.storage_expires_at) return { renewed: false }

  const expiresAt  = new Date(issuer.storage_expires_at)
  const daysLeft   = Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000)
  const reserve    = Number(issuer.renewal_reserve_usdc ?? 0)

  if (daysLeft > 7 || reserve <= 0) return { renewed: false }

  const { storageGb, storageLabel } = await calculateStorageForUsdc(reserve)

  const nextExpiry = new Date(Date.now() + 365 * 86_400_000)
  await supabase.from('issuers').update({
    renewal_reserve_usdc: 0,
    storage_expires_at:   nextExpiry.toISOString(),
    storage_purchased_gb: storageGb,
  }).eq('wallet_address', walletAddress)

  return {
    renewed: true,
    storageLabel,
    message: `¡Renovado! Obtuviste ${storageLabel} por 365 días más.`,
  }
}
