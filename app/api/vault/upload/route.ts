import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { uploadToShdwDrive } from '@/lib/shdwdrive'

export async function POST(req: NextRequest) {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: vault } = await supabaseAdmin
    .from('vault_accounts').select('storage_gb, storage_used_gb').eq('wallet_address', wallet).single()
  if (!vault) return NextResponse.json({ error: 'Vault no activo' }, { status: 403 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ALLOWED = ['application/pdf', 'image/webp', 'video/webm']
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Tipo no permitido' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Máx 5 MB' }, { status: 400 })

  const fileSizeGb = file.size / (1024 ** 3)
  if (vault.storage_used_gb + fileSizeGb > vault.storage_gb) {
    return NextResponse.json({ error: 'Sin espacio disponible en el vault' }, { status: 402 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const upload = await uploadToShdwDrive(buffer, file.type, { vault_owner: wallet }, wallet)

  await supabaseAdmin.from('vault_files').insert({
    owner_wallet: wallet,
    file_name: file.name,
    shadow_url: upload.id,
    file_size_bytes: file.size,
    file_type: file.type,
  })

  await supabaseAdmin.from('vault_accounts')
    .update({ storage_used_gb: vault.storage_used_gb + fileSizeGb })
    .eq('wallet_address', wallet)

  return NextResponse.json({ ok: true })
}
