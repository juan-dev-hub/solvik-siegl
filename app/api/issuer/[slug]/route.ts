import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { data: issuer } = await supabaseAdmin
      .from('issuers')
      .select('wallet_address, institution_name, slug, sns_domain, sns_verified, registered_at, page_active, page_headline, page_tagline, page_about, page_cta')
      .eq('slug', params.slug)
      .single()

    if (!issuer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: certs } = await supabaseAdmin
      .from('certificates')
      .select('id, arweave_tx_id, issued_to, doc_type, issued_at, expires_at')
      .eq('issuer_wallet', issuer.wallet_address)
      .eq('is_public', true)
      .order('issued_at', { ascending: false })

    return NextResponse.json({ issuer, certificates: certs ?? [] })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
