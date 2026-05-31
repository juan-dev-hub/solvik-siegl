import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from('digital_products')
    .select(`id, title, description, cover_url, price_usdc, total_copies, sold_copies, issuer_wallet, issuers:issuer_wallet (institution_name, slug)`)
    .eq('id', params.id)
    .eq('is_active', true)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ product: data })
}
