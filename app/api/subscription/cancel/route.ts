import { NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabaseAdmin
    .from('issuers')
    .update({ auto_renew: false })
    .eq('wallet_address', wallet)

  return NextResponse.json({ ok: true })
}
