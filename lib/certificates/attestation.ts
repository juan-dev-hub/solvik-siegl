import { createHash } from 'crypto'

export async function createAttestation(params: {
  subject: string
  storage_url: string
  doc_type: string
}): Promise<string> {
  try {
    const payload = JSON.stringify({
      subject: params.subject,
      storage_url: params.storage_url,
      doc_type: params.doc_type,
      platform: 'Solvik Studio',
    })
    return createHash('sha256').update(payload).digest('hex')
  } catch (err) {
    console.error('Attestation error:', err)
    return ''
  }
}

export async function verifyAttestation(pda: string): Promise<boolean> {
  return typeof pda === 'string' && pda.length > 0
}
