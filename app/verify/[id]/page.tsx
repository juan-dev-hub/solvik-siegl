import { supabaseAdmin } from '@/lib/supabase'
import { verifyAttestation } from '@/lib/sas'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { VerifyCard } from '@/components/VerifyCard'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Verify certificate · Solvik Studio',
    robots: { index: false, follow: false },
  }
}

type CertWithIssuer = {
  id: string
  arweave_tx_id: string
  issued_to: string
  issuer_wallet: string
  issuer_name: string
  doc_type: string
  file_name: string
  file_size_bytes: number
  issued_at: string
  expires_at: string | null
  cnft_address: string | null
  attestation_pda: string | null
  issuers: {
    institution_name: string
    sns_domain: string | null
    sns_verified: boolean
  } | null
}

export default async function VerifyPage({ params }: { params: { id: string } }) {
  const { data: cert } = await supabaseAdmin
    .from('certificates')
    .select(`*, issuers (institution_name, sns_domain, sns_verified)`)
    .eq('arweave_tx_id', params.id)
    .single<CertWithIssuer>()

  if (!cert) notFound()

  let attestationActive = false
  if (cert.attestation_pda) {
    attestationActive = await verifyAttestation(cert.attestation_pda)
  }

  // Register verification visit
  await supabaseAdmin.from('certificate_verifications').insert({
    certificate_id: cert.id,
    user_agent: 'server',
  }).then(() => {})

  return (
    <VerifyCard
      cert={{
        arweave_tx_id:   cert.arweave_tx_id,
        issued_to:       cert.issued_to,
        issuer_wallet:   cert.issuer_wallet,
        issuer_name:     cert.issuer_name,
        doc_type:        cert.doc_type,
        issued_at:       cert.issued_at,
        expires_at:      cert.expires_at,
        cnft_address:    cert.cnft_address,
        attestation_pda: cert.attestation_pda,
        issuers:         cert.issuers,
        attestationActive,
      }}
    />
  )
}
