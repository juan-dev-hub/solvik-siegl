import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { shdw_bucket } = (await req.json()) as { shdw_bucket: string }
    if (!shdw_bucket) return NextResponse.json({ error: 'Missing shdw_bucket' }, { status: 400 })

    await supabaseAdmin
      .from('issuers')
      .update({ shadow_account_pubkey: shdw_bucket })
      .eq('wallet_address', wallet)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
