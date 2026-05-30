export const PLAN_STORAGE: Record<string, number> = {
  verk:    524_288_000,    // 500 MB
  starter: 1_073_741_824,  // 1 GB
  pro:     5_368_709_120,  // 5 GB
  studio:  21_474_836_480, // 20 GB
}

export const PLAN_PRICES_USDC: Record<string, bigint> = {
  verk:    10_000_000n,  // $10
  starter: 49_000_000n,  // $49
  pro:     99_000_000n,  // $99
  studio:  249_000_000n, // $249
}

// Mes 1 (primer pago): Owner 50% | Gas/Trees 20% | Shadow Drive 20% | Contract 10%
// Owner keeps the remaining 50% in OWNER_WALLET — no transfer needed for that share
export function calculateFirstPaymentSplit(totalAmount: bigint): {
  gas_amount: bigint
  shadow_amount: bigint
  contract_amount: bigint
} {
  return {
    gas_amount:      (totalAmount * 20n) / 100n,
    shadow_amount:   (totalAmount * 20n) / 100n,
    contract_amount: (totalAmount * 10n) / 100n,
  }
}

// Mes 2+: Owner 50% | Gas/Trees 30% | Contract 20% | Shadow Drive 0%
export function calculateRenewalSplit(totalAmount: bigint): {
  gas_amount: bigint
  contract_amount: bigint
} {
  return {
    gas_amount:      (totalAmount * 30n) / 100n,
    contract_amount: (totalAmount * 20n) / 100n,
  }
}

// Book purchase: 5% Solvik | 15% fee pool | 10% contract | 70% issuer
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
