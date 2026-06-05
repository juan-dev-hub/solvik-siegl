// Records a Vault storage subscription on-chain (Solvik Vault).
// The wallet owns a storage bucket on Shadow Drive; this registers the subscription on-chain.
export async function recordVaultSubscription(params: {
  walletAddress: string
  storageGb: number
  expiresAt: number   // Unix timestamp
  bucketPublicKey: string
}): Promise<void> {
  // TODO: call Anchor record_vault_subscription instruction when program is deployed
  console.log(`[contract] recordVaultSubscription: wallet=${params.walletAddress} gb=${params.storageGb}`)
}

export async function renewVaultSubscription(params: {
  walletAddress: string
  newExpiresAt: number
}): Promise<void> {
  // TODO: call Anchor renew_vault_subscription instruction when program is deployed
  console.log(`[contract] renewVaultSubscription: wallet=${params.walletAddress}`)
}
