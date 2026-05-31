import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

async function findCert(id: string) {
  // Try by UUID first (new certs), then by storage URL for backward compat
  const byId = await supabaseAdmin
    .from('certificates')
    .select(`*, issuers (institution_name, sns_domain, sns_verified)`)
    .eq('id', id)
    .maybeSingle()
  if (byId.data) return byId.data

  const byStorage = await supabaseAdmin
    .from('certificates')
    .select(`*, issuers (institution_name, sns_domain, sns_verified)`)
    .eq('storage_url', id)
    .maybeSingle()
  return byStorage.data ?? null
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await findCert(params.id)
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
    const cert = await findCert(params.id)
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
