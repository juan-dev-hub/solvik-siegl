// Records a certificate on-chain after successful Arweave upload.
// Only callable with ISSUER_WALLET_SECRET.
export async function recordCertificate(params: {
  issuerWallet: string
  arweaveTxId: string
  issuedAt: number
}): Promise<void> {
  // TODO: call Anchor record_certificate instruction when program is deployed
  console.log(`[contract] recordCertificate: ${params.arweaveTxId}`)
}
