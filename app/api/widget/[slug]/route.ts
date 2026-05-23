import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function escapeXml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const { data: issuer } = await supabaseAdmin
    .from('issuers')
    .select('wallet_address, institution_name')
    .eq('slug', params.slug)
    .single()

  if (!issuer) return new NextResponse('Not found', { status: 404 })

  const { count } = await supabaseAdmin
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('issuer_wallet', issuer.wallet_address)
    .eq('is_public', true)

  const n = count ?? 0
  const name = escapeXml(issuer.institution_name)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="64">
  <rect width="420" height="64" rx="10" fill="#0a2952"/>
  <text x="16" y="24" font-family="Inter,sans-serif" font-size="12" font-weight="600" fill="#4ABAFF" opacity="0.7">${name}</text>
  <text x="16" y="47" font-family="Inter,sans-serif" font-size="14" font-weight="700" fill="#4ABAFF">${n} certificados verificados · powered by Solvik Studio</text>
</svg>`

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
