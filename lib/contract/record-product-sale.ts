// Records a digital product sale on-chain (Solvik Torg).
// Split: 70% creator / 15% gas / 10% contract / 5% owner
export async function recordProductSale(params: {
  sellerWallet: string
  buyerWallet: string
  productId: string
  amountUsdc: bigint
  licenseHash: string
}): Promise<void> {
  // TODO: call Anchor record_product_sale instruction when program is deployed
  console.log(`[contract] recordProductSale: product=${params.productId} amount=${params.amountUsdc}`)
}

export async function distributeProductRevenue(params: {
  sellerWallet: string
  totalAmount: bigint
}): Promise<void> {
  // TODO: call Anchor distribute_product_revenue when program is deployed
  // Split: 70% creator → sellerWallet, 15% gas → FEE_POOL_WALLET,
  //        10% reserve → CONTRACT_WALLET, 5% platform → OWNER_WALLET
  console.log(`[contract] distributeProductRevenue: seller=${params.sellerWallet}`)
}
