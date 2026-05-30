import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { uploadToShdwDrive } from '@/lib/shdwdrive'

export async function POST(req: NextRequest) {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: issuer } = await supabaseAdmin
    .from('issuers').select('plan').eq('wallet_address', wallet).single()
  if (!issuer?.plan || issuer.plan === 'free') {
    return NextResponse.json({ error: 'Necesitás un plan activo para publicar obras.' }, { status: 403 })
  }

  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const cover = form.get('cover') as File | null
    const title = (form.get('title') as string)?.trim()
    const description = (form.get('description') as string)?.trim() || null
    const priceRaw = form.get('price_usdc') as string
    const totalCopies = parseInt(form.get('total_copies') as string, 10)

    if (!file || !title || !priceRaw) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const priceUsdc = Math.round(parseFloat(priceRaw) * 1_000_000)
    if (priceUsdc <= 0 || isNaN(priceUsdc)) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await uploadToShdwDrive(fileBuffer, file.type, {
      'Product-Title': title,
    }, wallet)
    const arweaveTxId = uploadResult.id

    let coverArweaveId: string | null = null
    if (cover && cover.size > 0) {
      const coverBuffer = Buffer.from(await cover.arrayBuffer())
      const coverResult = await uploadToShdwDrive(coverBuffer, cover.type, {}, wallet)
      coverArweaveId = coverResult.id
    }

    const { data: product, error } = await supabaseAdmin
      .from('digital_products')
      .insert({
        issuer_wallet: wallet,
        title,
        description,
        arweave_tx_id: arweaveTxId,
        cover_arweave_id: coverArweaveId,
        price_usdc: priceUsdc,
        total_copies: isNaN(totalCopies) ? 9999 : totalCopies,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, product })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
