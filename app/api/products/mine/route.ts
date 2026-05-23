import { NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ products: [] }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('digital_products')
    .select('id, title, price_usdc, total_copies, sold_copies, is_active, created_at')
    .eq('issuer_wallet', wallet)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ products: [] })
  return NextResponse.json({ products: data ?? [] })
}
