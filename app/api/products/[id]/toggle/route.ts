import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: product } = await supabaseAdmin
    .from('digital_products')
    .select('is_active, issuer_wallet')
    .eq('id', params.id)
    .single()

  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (product.issuer_wallet !== wallet) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabaseAdmin
    .from('digital_products')
    .update({ is_active: !product.is_active })
    .eq('id', params.id)

  return NextResponse.json({ ok: true, is_active: !product.is_active })
}
