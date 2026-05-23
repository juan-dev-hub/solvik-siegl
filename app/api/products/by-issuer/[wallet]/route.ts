import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { wallet: string } }) {
  const { data, error } = await supabaseAdmin
    .from('digital_products')
    .select('id, title, description, cover_arweave_id, price_usdc, total_copies, sold_copies')
    .eq('issuer_wallet', params.wallet)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ products: [] })
  return NextResponse.json({ products: data ?? [] })
}
