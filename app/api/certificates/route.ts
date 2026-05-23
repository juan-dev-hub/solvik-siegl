import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateCertificatePDF } from '@/lib/generate-pdf'

export async function GET(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const page   = Number(searchParams.get('page') ?? '1')
    const limit  = Number(searchParams.get('limit') ?? '20')
    const search = searchParams.get('search') ?? ''
    const offset = (page - 1) * limit

    let query = supabaseAdmin
      .from('certificates')
      .select('*', { count: 'exact' })
      .eq('issuer_wallet', wallet)
      .order('issued_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) query = query.ilike('issued_to', `%${search}%`)

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data ?? [], total: count ?? 0 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

// POST: regenerate PDF from arweave_tx_id
export async function POST(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { arweave_tx_id } = (await req.json()) as { arweave_tx_id: string }

    const { data: cert } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('arweave_tx_id', arweave_tx_id)
      .eq('issuer_wallet', wallet)
      .single()

    if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })

    const pdfBuffer = await generateCertificatePDF({
      issued_to: cert.issued_to,
      issuer_name: cert.issuer_name,
      doc_type: cert.doc_type,
      issued_at: cert.issued_at,
      expires_at: cert.expires_at,
      arweave_tx_id: cert.arweave_tx_id,
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${cert.issued_to}.pdf"`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
