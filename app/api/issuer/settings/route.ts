import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { page_active, page_headline, page_tagline, page_about, page_cta } =
      (await req.json()) as {
        page_active: boolean
        page_headline: string
        page_tagline: string
        page_about: string
        page_cta: string
      }

    const { error } = await supabaseAdmin
      .from('issuers')
      .update({ page_active, page_headline, page_tagline, page_about, page_cta })
      .eq('wallet_address', wallet)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
