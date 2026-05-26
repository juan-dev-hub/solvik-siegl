// Estimates Arweave storage cost in USDC using Pyth price oracle.
// AR/USD price is fetched at payment time so the client always receives
// the promised storage regardless of AR price fluctuations.
export async function estimateArweaveCostUSDC(bytes: number): Promise<number> {
  // TODO: integrate Pyth oracle when contract is live
  // For now, estimate: ~$0.008 per MB at current AR prices
  const MB = bytes / 1_000_000
  return Math.ceil(MB * 0.008 * 100) / 100
}
