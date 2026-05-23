import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { uploadToArweave } from '@/lib/arweave'
import { mintCNFT } from '@/lib/cnft'
import { createAttestation } from '@/lib/sas'
import { generateCertificatePDF } from '@/lib/generate-pdf'

const ALLOWED_TYPES = ['application/pdf', 'image/webp', 'video/webm']
const MAX_SIZE = 5 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: issuer } = await supabaseAdmin
      .from('issuers').select('*').eq('wallet_address', wallet).single()
    if (!issuer || issuer.credits < 1) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
    }

    const fd = await req.formData()
    const file     = fd.get('file') as File | null
    const issuedTo = (fd.get('issued_to') as string)?.trim()
    const docType  = fd.get('doc_type') as string
    const expiresAt = fd.get('expires_at') as string | null

    if (!file || !issuedTo) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Solo aceptamos PDF, WebP y WebM. Convierte tu archivo antes de subirlo para pagar menos en Arweave.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File exceeds 5 MB' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    const arweave = await uploadToArweave(buffer, file.type, {
      doc_type: docType,
      issuer_wallet: wallet,
      issued_to: issuedTo,
    })

    const arweaveTxId = arweave.id
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.solvikstudio.com'
    const verifyUrl = `${appUrl}/verify/${arweaveTxId}`

    // Mint cNFT
    let cnftAddress: string | null = null
    try {
      cnftAddress = await mintCNFT({
        name: `Solvik Studio Certificate — ${issuedTo}`,
        symbol: 'SVKS',
        uri: `https://arweave.net/${arweaveTxId}`,
        recipientAddress: wallet,
      })
    } catch (e) {
      console.error('cNFT mint error:', e)
    }

    // SAS Attestation
    let attestationPda: string | null = null
    try {
      attestationPda = await createAttestation({
        subject: wallet,
        arweave_tx_id: arweaveTxId,
        doc_type: docType,
      })
    } catch (e) {
      console.error('SAS error:', e)
    }

    // Decrement credit
    await supabaseAdmin
      .from('issuers')
      .update({ credits: issuer.credits - 1 })
      .eq('wallet_address', wallet)

    const issuerName = issuer.institution_name ?? 'Solvik Studio'

    await supabaseAdmin.from('certificates').insert({
      issuer_wallet: wallet,
      arweave_tx_id: arweaveTxId,
      cnft_address: cnftAddress,
      attestation_pda: attestationPda,
      file_name: file.name,
      file_size_bytes: file.size,
      doc_type: docType,
      issuer_name: issuerName,
      issued_to: issuedTo,
      is_public: true,
      expires_at: expiresAt ?? null,
    })

    // Generate PDF in memory
    const pdfBuffer = await generateCertificatePDF({
      issued_to: issuedTo,
      issuer_name: issuerName,
      doc_type: docType,
      issued_at: new Date().toISOString(),
      expires_at: expiresAt,
      arweave_tx_id: arweaveTxId,
    })

    return NextResponse.json({
      arweave_tx_id: arweaveTxId,
      cnft_address: cnftAddress,
      attestation_pda: attestationPda,
      verify_url: verifyUrl,
      pdf: pdfBuffer.toString('base64'),
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
