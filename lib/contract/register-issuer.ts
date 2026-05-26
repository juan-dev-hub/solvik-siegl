// Registers a new issuer on-chain via the Anchor program.
// Called once on first subscription payment.
export async function registerIssuer(
  walletAddress: string,
  planId: string
): Promise<void> {
  // TODO: call Anchor register_issuer instruction when program is deployed
  console.log(`[contract] registerIssuer: ${walletAddress} plan=${planId}`)
}
