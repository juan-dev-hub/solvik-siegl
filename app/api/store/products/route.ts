import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('digital_products')
    .select(`
      id, title, description, cover_arweave_id,
      price_usdc, total_copies, sold_copies, issuer_wallet,
      issuers:issuer_wallet (institution_name, slug)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ products: [] })
  return NextResponse.json({ products: data ?? [] })
}
