import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabaseAdmin
    .from('digital_licenses')
    .select(`
      id, buyer_wallet, cnft_address, purchased_at, solana_tx_hash,
      digital_products (title, description, issuer_wallet, issuers:issuer_wallet (institution_name))
    `)
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'License not found' }, { status: 404 })
  return NextResponse.json({ license: data })
}
