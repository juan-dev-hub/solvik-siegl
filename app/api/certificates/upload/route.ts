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

    // Resolver issuer real: si la wallet conectada es un helper,
    // todas las operaciones se ejecutan bajo el issuer dueño de la cuenta.
    // El certificado queda firmado por el issuer, no por el helper.
    let issuerWallet = wallet
    const { data: ownerRow } = await supabaseAdmin
      .from('issuers')
      .select('wallet_address, plan')
      .contains('helper_wallets', [wallet])
      .single()
    if (ownerRow) {
      issuerWallet = ownerRow.wallet_address
    }

    const { data: planCheck } = await supabaseAdmin.from('issuers').select('plan').eq('wallet_address', issuerWallet).single()
    if (planCheck?.plan === 'verk') return NextResponse.json({ error: 'El plan VERK no incluye emisión de certificados.' }, { status: 403 })

    if (!file || !issuedTo) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const validation = await validateFileAndAccess(issuerWallet, file.size, file.type)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 402 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const upload = await uploadToShdwDrive(buffer, file.type, {
      doc_type: docType,
      issuer_wallet: issuerWallet,
      issued_to: issuedTo,
    }, issuerWallet)
    const storageUrl = upload.id

    let cnftAddress: string | null = null
    try {
      cnftAddress = await mintCNFT({
        name: `Solvik Studio Certificate — ${issuedTo}`,
        symbol: 'SVKS',
        uri: storageUrl,
        recipientAddress: issuerWallet,
      })
    } catch (e) {
      console.error('cNFT mint error:', e)
    }

    let attestationPda: string | null = null
    try {
      attestationPda = await createAttestation({
        subject: issuerWallet,
        arweave_tx_id: storageUrl,
        doc_type: docType,
      })
    } catch (e) {
      console.error('Attestation error:', e)
    }

    await updateStorageUsed(issuerWallet, file.size)

    const { data: issuer } = await supabaseAdmin
      .from('issuers').select('institution_name').eq('wallet_address', issuerWallet).single()
    const issuerName = issuer?.institution_name ?? 'Solvik Studio'

    const { data: cert } = await supabaseAdmin.from('certificates').insert({
      issuer_wallet: issuerWallet,
      arweave_tx_id: storageUrl,
      cnft_address: cnftAddress,
      file_name: file.name,
      file_size_bytes: file.size,
      doc_type: docType,
      issuer_name: issuerName,
      issued_to: issuedTo,
      is_public: true,
      expires_at: expiresAt ?? null,
    }).select('id').single()

    const certId = cert?.id ?? storageUrl
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.solvikstudio.com'
    const verifyUrl = `${appUrl}/verify/${certId}`

    const pdfBuffer = await generateCertificatePDF({
      issued_to: issuedTo,
      issuer_name: issuerName,
      doc_type: docType,
      issued_at: new Date().toISOString(),
      expires_at: expiresAt,
      cert_id: certId,
      storage_url: storageUrl,
    })

    return NextResponse.json({
      storage_url: storageUrl,
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
