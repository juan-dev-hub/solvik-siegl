import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { uploadToShdwDrive } from '@/lib/shdwdrive'

export async function POST(req: NextRequest) {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: creator } = await supabaseAdmin
    .from('creators').select('wallet_address').eq('wallet_address', wallet).single()
  if (!creator) return NextResponse.json({ error: 'No tenés un canal activo' }, { status: 403 })

  const form = await req.formData()
  const file  = form.get('file') as File | null
  const thumb = form.get('thumbnail') as File | null
  const title = (form.get('title') as string)?.trim()
  const desc  = (form.get('description') as string)?.trim() || null
  const isPremium = form.get('is_premium') === 'true'

  if (!file || !title) return NextResponse.json({ error: 'Archivo y título requeridos' }, { status: 400 })

  const ALLOWED = ['application/pdf', 'image/webp', 'video/webm']
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Tipo no permitido' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Máx 5 MB' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const upload = await uploadToShdwDrive(buffer, file.type, { creator_wallet: wallet }, wallet)

  let thumbnailUrl: string | null = null
  if (thumb && thumb.size > 0 && thumb.type === 'image/webp') {
    const thumbBuffer = Buffer.from(await thumb.arrayBuffer())
    const thumbUpload = await uploadToShdwDrive(thumbBuffer, 'image/webp', { type: 'thumbnail' }, wallet)
    thumbnailUrl = thumbUpload.id
  }

  const { data: content, error } = await supabaseAdmin
    .from('creator_content')
    .insert({
      creator_wallet: wallet,
      title,
      description: desc,
      shadow_url: upload.id,
      file_type: file.type,
      file_size_bytes: file.size,
      is_premium: isPremium,
      thumbnail_url: thumbnailUrl,
    })
    .select().single()

  if (error) throw error
  return NextResponse.json({ ok: true, content })
}
