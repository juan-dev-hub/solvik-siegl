import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { PDFDocument, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.solvikstudio.com'

async function embedQrOnAllPages(
  pdfBytes: ArrayBuffer,
  licenseId: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const qrUrl = `${APP_URL}/license/${licenseId}`

  // Generate QR as PNG buffer
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 80, margin: 1 })
  const qrBase64 = qrDataUrl.split(',')[1]
  const qrBytes = Buffer.from(qrBase64, 'base64')
  const qrImage = await pdfDoc.embedPng(qrBytes)

  const pages = pdfDoc.getPages()
  for (const page of pages) {
    const { width } = page.getSize()
    // QR in bottom-right corner
    page.drawImage(qrImage, {
      x: width - 88,
      y: 8,
      width: 80,
      height: 80,
    })
    // Tiny label under the QR
    page.drawText('Licencia verificada · Solvik Studio', {
      x: width - 88,
      y: 4,
      size: 5,
      color: rgb(0.4, 0.4, 0.5),
    })
  }

  return pdfDoc.save()
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const licenseId = searchParams.get('license')

  if (!licenseId) {
    return NextResponse.json({ error: 'Missing license' }, { status: 400 })
  }

  // Validate license belongs to this product — buyer_wallet is authoritative from DB
  const { data: license } = await supabaseAdmin
    .from('digital_licenses')
    .select('id, product_id, buyer_wallet, arweave_tx_id')
    .eq('id', licenseId)
    .eq('product_id', params.id)
    .single()

  if (!license) return NextResponse.json({ error: 'License not found' }, { status: 404 })

  const { data: product } = await supabaseAdmin
    .from('digital_products')
    .select('title, arweave_tx_id')
    .eq('id', params.id)
    .single()

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  // Fetch original PDF from Arweave
  const arweaveRes = await fetch(`https://arweave.net/${product.arweave_tx_id}`)
  if (!arweaveRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch source file' }, { status: 502 })
  }

  const originalBytes = await arweaveRes.arrayBuffer()

  // Embed QR on every page — PDF generated in memory, never saved to disk
  const modifiedBytes = await embedQrOnAllPages(originalBytes, licenseId)

  const safeTitle = product.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  return new NextResponse(Buffer.from(modifiedBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeTitle}_licensed.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
