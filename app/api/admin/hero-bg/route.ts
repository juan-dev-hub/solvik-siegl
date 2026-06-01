import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { uploadToShdwDrive } from '@/lib/shdwdrive'

// GET — público, cualquiera puede leer la URL del fondo
export async function GET() {
  const { data } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'hero_bg_image')
    .single()
  return NextResponse.json({ url: data?.value ?? null })
}

// POST — solo ADMIN_WALLET puede subir
export async function POST(req: NextRequest) {
  const wallet = await getWalletSession()
  if (!wallet || wallet !== process.env.ADMIN_WALLET) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.type !== 'image/webp') return NextResponse.json({ error: 'Solo se aceptan archivos WebP' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Máx 5 MB' }, { status: 400 })

  // Buscar la cuenta de Shadow Drive del admin
  const { data: issuer } = await supabaseAdmin
    .from('issuers')
    .select('shadow_account_pubkey')
    .eq('wallet_address', wallet)
    .single()

  const shadowAccount = issuer?.shadow_account_pubkey
  if (!shadowAccount || shadowAccount.startsWith('DEV_') || shadowAccount.startsWith('DEVNET_')) {
    return NextResponse.json({
      error: 'Para subir imágenes necesitás activar el plan con una suscripción real que provisione Shadow Drive.',
    }, { status: 422 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await uploadToShdwDrive(buffer, 'image/webp', { type: 'hero_bg' }, wallet)
  const url = result.id

  await supabaseAdmin
    .from('system_config')
    .upsert({ key: 'hero_bg_image', value: url }, { onConflict: 'key' })

  return NextResponse.json({ ok: true, url })
}
