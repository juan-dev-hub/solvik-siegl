import { NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ licenses: [] }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('digital_licenses')
    .select(`
      id, purchased_at, solana_tx_hash, cnft_address,
      digital_products (
        id, title, cover_arweave_id,
        issuers:issuer_wallet (institution_name, slug)
      )
    `)
    .eq('buyer_wallet', wallet)
    .order('purchased_at', { ascending: false })

  if (error) return NextResponse.json({ licenses: [] })
  return NextResponse.json({ licenses: data ?? [] })
}
