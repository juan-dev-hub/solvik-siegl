import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { uploadToShdwDrive } from '@/lib/shdwdrive'
import { mintCNFT } from '@/lib/cnft'
import { generateCertificatePDF, createAttestation, validateFileAndAccess, updateStorageUsed } from '@/lib/certificates'

export async function POST(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const fd = await req.formData()
    const file      = fd.get('file') as File | null
    const issuedTo  = (fd.get('issued_to') as string)?.trim()
    const docType   = fd.get('doc_type') as string
    const expiresAt = fd.get('expires_at') as string | null

    if (!file || !issuedTo) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const validation = await validateFileAndAccess(wallet, file.size, file.type)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 402 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const arweave = await uploadToShdwDrive(buffer, file.type, {
      doc_type: docType,
      issuer_wallet: wallet,
      issued_to: issuedTo,
    }, wallet)
    const arweaveTxId = arweave.id
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.solvikstudio.com'
    const verifyUrl = `${appUrl}/verify/${arweaveTxId}`

    let cnftAddress: string | null = null
    try {
      cnftAddress = await mintCNFT({
        name: `Solvik Studio Certificate — ${issuedTo}`,
        symbol: 'SVKS',
        uri: arweaveTxId,
        recipientAddress: wallet,
        issuerWallet: wallet,
      })
    } catch (e) {
      console.error('cNFT mint error:', e)
    }

    let attestationPda: string | null = null
    try {
      attestationPda = await createAttestation({
        subject: wallet,
        arweave_tx_id: arweaveTxId,
        doc_type: docType,
      })
    } catch (e) {
      console.error('Attestation error:', e)
    }

    await updateStorageUsed(wallet, file.size)

    const { data: issuer } = await supabaseAdmin
      .from('issuers').select('institution_name').eq('wallet_address', wallet).single()
    const issuerName = issuer?.institution_name ?? 'Solvik Studio'

    await supabaseAdmin.from('certificates').insert({
      issuer_wallet: wallet,
      arweave_tx_id: arweaveTxId,
      cnft_address: cnftAddress,
      file_name: file.name,
      file_size_bytes: file.size,
      doc_type: docType,
      issuer_name: issuerName,
      issued_to: issuedTo,
      is_public: true,
      expires_at: expiresAt ?? null,
    })

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
