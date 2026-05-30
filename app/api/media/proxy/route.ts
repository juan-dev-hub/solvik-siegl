import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

const PREVIEW_SCALE = 0.45   // 45% of original resolution
const WATERMARK_OPACITY = 0.38

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url')
  if (!rawUrl) return new NextResponse('Missing url', { status: 400 })

  let imageUrl: string
  try {
    imageUrl = decodeURIComponent(rawUrl)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  // Only allow our own storage domains
  const allowed = ['arweave.net', 'shdw-drive.genesysgo.net']
  if (!allowed.some(d => imageUrl.includes(d))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return new NextResponse('Failed to fetch image', { status: 502 })

    const contentType = res.headers.get('content-type') ?? ''

    // Only process images — return other types as-is (PDF, video, etc.)
    if (!contentType.startsWith('image/')) {
      const body = await res.arrayBuffer()
      return new NextResponse(body, {
        headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
      })
    }

    const originalBuffer = Buffer.from(await res.arrayBuffer())

    // Get dimensions to build watermark SVG
    const meta = await sharp(originalBuffer).metadata()
    const w = meta.width  ?? 800
    const h = meta.height ?? 600

    const previewW = Math.floor(w * PREVIEW_SCALE)
    const previewH = Math.floor(h * PREVIEW_SCALE)
    const fontSize  = Math.max(14, Math.floor(previewW / 10))

    const watermarkSvg = Buffer.from(`
      <svg width="${previewW}" height="${previewH}" xmlns="http://www.w3.org/2000/svg">
        <text
          x="50%" y="50%"
          text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold"
          fill="rgba(255,255,255,${WATERMARK_OPACITY})"
          transform="rotate(-30 ${previewW / 2} ${previewH / 2})"
        >Solvik Studio</text>
        <text
          x="50%" y="${Math.floor(previewH / 2) + fontSize + 8}"
          text-anchor="middle" dominant-baseline="middle"
          font-family="Arial, sans-serif" font-size="${Math.floor(fontSize * 0.55)}"
          fill="rgba(255,255,255,${WATERMARK_OPACITY * 0.7})"
          transform="rotate(-30 ${previewW / 2} ${previewH / 2 + fontSize + 8})"
        >Vista previa</text>
      </svg>
    `)

    const processed = await sharp(originalBuffer)
      .resize(previewW, previewH, { fit: 'inside' })
      .composite([{ input: watermarkSvg, blend: 'over' }])
      .webp({ quality: 72 })
      .toBuffer()

    return new NextResponse(processed as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (err) {
    console.error('Media proxy error:', err)
    return new NextResponse('Processing error', { status: 500 })
  }
}
