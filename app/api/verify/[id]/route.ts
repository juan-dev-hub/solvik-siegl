import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data } = await supabaseAdmin
      .from('certificates')
      .select(`*, issuers (institution_name, sns_domain, sns_verified)`)
      .eq('arweave_tx_id', params.id)
      .single()

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Record every API-level visit
    await supabaseAdmin
      .from('certificate_verifications')
      .insert({ certificate_id: data.id, user_agent: 'api' })
      .then(() => {})

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data: cert } = await supabaseAdmin
      .from('certificates')
      .select('id')
      .eq('arweave_tx_id', params.id)
      .single()

    if (cert) {
      const ua = req.headers.get('user-agent') ?? ''
      await supabaseAdmin.from('certificate_verifications').insert({
        certificate_id: cert.id,
        user_agent: ua,
      })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
