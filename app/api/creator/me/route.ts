import { NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: creator } = await supabaseAdmin
    .from('creators').select('*').eq('wallet_address', wallet).single()

  if (!creator) return NextResponse.json({ creator: null, content: [] })

  const { data: content } = await supabaseAdmin
    .from('creator_content')
    .select('id, title, created_at, is_premium, file_type')
    .eq('creator_wallet', wallet)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ creator, content: content ?? [] })
}
