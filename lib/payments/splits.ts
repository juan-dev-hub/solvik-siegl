export const PLAN_STORAGE: Record<string, number> = {
  starter:  1_073_741_824,  // 1 GB
  pro:      5_368_709_120,  // 5 GB
  studio:  21_474_836_480,  // 20 GB
}

export const PLAN_PRICES_USDC: Record<string, bigint> = {
  starter:  49_000_000n,  // $49
  pro:      99_000_000n,  // $99
  studio:  249_000_000n,  // $249
}

// First payment split — backend does this ONCE only
export function calculateFirstPaymentSplit() {
  return {
    contractAmount: BigInt(20_000_000), // $20 USDC → deploy + activation
    merkleAmount:   BigInt(10_000_000), // $10 → Merkle tree
    solanaBuffer:   BigInt(3_000_000),  // $3  → Solana fees buffer
    feePoolTotal:   BigInt(13_000_000), // $13 total → FEE_POOL_WALLET
  }
}

// Subsequent payments — the contract handles these via Pyth oracle.
// These are fixed fallback amounts used until the contract is live.
export function calculateRenewalSplit(totalAmount: bigint): {
  owner_amount: bigint
  fee_pool_amount: bigint
} {
  const fee_pool_amount = (totalAmount * 15n) / 100n
  const owner_amount = totalAmount - fee_pool_amount
  return { owner_amount, fee_pool_amount }
}

// Book purchase split: 5% Solvik + 15% fee pool + 10% contract + 70% issuer
export function calculateBookSplit(totalAmount: bigint): {
  comision_solvik: bigint
  fee_pool_amount: bigint
  contract_amount: bigint
  issuer_amount: bigint
} {
  const fee_pool_amount = (totalAmount * 15n) / 100n
  const contract_amount = (totalAmount * 10n) / 100n
  const comision_solvik = (totalAmount * 5n) / 100n
  const issuer_amount = totalAmount - fee_pool_amount - contract_amount - comision_solvik
  return { comision_solvik, fee_pool_amount, contract_amount, issuer_amount }
}

// Kept for backward compatibility
export function calculateSplit(
  totalAmount: bigint,
  contractActive: boolean
): { owner_amount: bigint; fee_pool_amount: bigint; contract_amount: bigint } {
  if (contractActive) {
    return {
      owner_amount: (totalAmount * 85n) / 100n,
      fee_pool_amount: (totalAmount * 15n) / 100n,
      contract_amount: 0n,
    }
  }
  return {
    owner_amount: (totalAmount * 75n) / 100n,
    fee_pool_amount: (totalAmount * 15n) / 100n,
    contract_amount: (totalAmount * 10n) / 100n,
  }
}
