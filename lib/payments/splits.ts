// ─────────────────────────────────────────────────────────────────────────────
// SPLITS DE PAGOS — Solvik Studio
//
// Cada plan tiene un precio fijo en USDC (6 decimales = micro-USDC).
// El pago llega completo a OWNER_WALLET; luego se redistribuye on-chain
// en una sola transacción multi-transfer firmada por OWNER_WALLET_SECRET.
//
// ESTRUCTURA DE WALLETS:
//   OWNER_WALLET      → recibe el pago original + queda con su porcentaje
//   FEE_POOL_WALLET   → gas de Solana (cNFTs, attestations, renovaciones)
//   SHADOW_WALLET     → compra SHDW → crea el bucket de Shadow Drive del usuario
//   CONTRACT_WALLET   → reserva para el contrato on-chain (cuando se active)
//
// SPLITS POR MES:
//   Mes 1 (primer pago del usuario):
//     Owner        60%  — ingreso neto
//     FeePool      20%  — gas de operaciones (cNFT, Shadow Drive, SAS, renovaciones)
//     Shadow Drive 10%  — compra SHDW → almacenamiento permanente e inmutable
//     Contract     10%  — reserva on-chain
//
//   Mes 2+ (renovaciones automáticas vía delegación):
//     Owner        60%  — ingreso neto
//     FeePool      20%  — gas (sin Shadow Drive porque el bucket ya existe)
//     Contract     20%  — reserva on-chain aumentada
//
// NOTA: el porcentaje de Owner no se transfiere explícitamente — simplemente
// queda en OWNER_WALLET después de enviar los otros tres porcentajes.
// ─────────────────────────────────────────────────────────────────────────────

// Precios en micro-USDC (1 USDC = 1_000_000)
export const PLAN_PRICES_USDC: Record<string, bigint> = {
  verk:   10_000_000n,  // $10  — tier base: obras digitales + tienda
  varde:  39_000_000n,  // $39  — tier medio: certificados + batch + helpers
  studio: 249_000_000n, // $249 — tier avanzado: todo + página pública de issuer
}

// ─── Primer pago: 60% Owner | 20% Gas | 10% Shadow | 10% Contract ────────────
// Se llama una sola vez por usuario (cuando isNewIssuer === true).
// El resultado indica cuánto transferir desde OWNER_WALLET a cada destino.
// Lo que no se transfiere (60%) permanece en OWNER_WALLET automáticamente.
export function calculateFirstPaymentSplit(totalAmount: bigint): {
  gas_amount: bigint      // → FEE_POOL_WALLET  (20%)
  shadow_amount: bigint   // → SHADOW_WALLET    (10%) — se convierte a SHDW
  contract_amount: bigint // → CONTRACT_WALLET  (10%)
} {
  return {
    gas_amount:      (totalAmount * 20n) / 100n,
    shadow_amount:   (totalAmount * 10n) / 100n,
    contract_amount: (totalAmount * 10n) / 100n,
  }
}

// ─── Renovación (mes 2+): 60% Owner | 20% Gas | 20% Contract ─────────────────
// Shadow Drive ya no necesita fondos (el bucket es inmutable y permanente).
// Se llama desde el cron diario de renovaciones (lib/cron/renew.ts).
export function calculateRenewalSplit(totalAmount: bigint): {
  gas_amount: bigint      // → FEE_POOL_WALLET  (20%)
  contract_amount: bigint // → CONTRACT_WALLET  (20%)
} {
  return {
    gas_amount:      (totalAmount * 20n) / 100n,
    contract_amount: (totalAmount * 20n) / 100n,
  }
}

// ─── Compra de obra digital (libro, curso, etc.) ──────────────────────────────
// Cuando un comprador adquiere un producto de un creador en la tienda.
// El creador recibe el 70%; Solvik cobra 5% de comisión de plataforma.
export function calculateBookSplit(totalAmount: bigint): {
  comision_solvik: bigint  //  5% → OWNER_WALLET (comisión plataforma)
  fee_pool_amount: bigint  // 15% → FEE_POOL_WALLET (gas de entrega)
  contract_amount: bigint  // 10% → CONTRACT_WALLET
  issuer_amount: bigint    // 70% → wallet del creador
} {
  const fee_pool_amount = (totalAmount * 15n) / 100n
  const contract_amount = (totalAmount * 10n) / 100n
  const comision_solvik = (totalAmount * 5n) / 100n
  const issuer_amount = totalAmount - fee_pool_amount - contract_amount - comision_solvik
  return { comision_solvik, fee_pool_amount, contract_amount, issuer_amount }
}
