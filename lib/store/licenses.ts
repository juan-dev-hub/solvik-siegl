import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function verifyLicense(
  productId: string,
  buyerWallet: string
): Promise<boolean> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('digital_licenses')
    .select('id')
    .eq('product_id', productId)
    .eq('buyer_wallet', buyerWallet)
    .single()
  return !!data
}

export async function getLicensesByBuyer(buyerWallet: string) {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('digital_licenses')
    .select('*, digital_products(*)')
    .eq('buyer_wallet', buyerWallet)
    .order('purchased_at', { ascending: false })
  return data ?? []
}
