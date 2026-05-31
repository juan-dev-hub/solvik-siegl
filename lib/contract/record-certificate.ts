// Records a certificate on-chain after Shadow Drive upload.
// Only callable with ISSUER_WALLET_SECRET.
export async function recordCertificate(params: {
  issuerWallet: string
  storageUrl: string
  issuedAt: number
}): Promise<void> {
  // TODO: call Anchor record_certificate instruction when program is deployed
  console.log(`[contract] recordCertificate: ${params.storageUrl}`)
}
