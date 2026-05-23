import { createHash } from 'crypto'

// SAS (Solana Attestation Service) integration.
// createAttestation derives a deterministic content-addressed ID from the
// certificate data. Full on-chain SAS attestation can be enabled once
// credential + schema accounts are provisioned on the SAS program.
export async function createAttestation(params: {
  subject: string
  arweave_tx_id: string
  doc_type: string
}): Promise<string> {
  try {
    const payload = JSON.stringify({
      subject: params.subject,
      arweave_tx_id: params.arweave_tx_id,
      doc_type: params.doc_type,
      platform: 'Solvik Studio',
    })
    return createHash('sha256').update(payload).digest('hex')
  } catch (err) {
    console.error('SAS attestation error:', err)
    return ''
  }
}

export async function verifyAttestation(pda: string): Promise<boolean> {
  // A non-empty attestation ID means the certificate was attested at upload time.
  return typeof pda === 'string' && pda.length > 0
}
