const SHDW_MINT = 'SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const SHDW_PER_GB = 1

export async function getShdwPriceInUsdc(): Promise<number> {
  const res = await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${USDC_MINT}&outputMint=${SHDW_MINT}&amount=1000000&slippageBps=50`,
    { signal: AbortSignal.timeout(5000) }
  )
  if (!res.ok) throw new Error('Jupiter SHDW quote failed')
  const data = await res.json() as { outAmount?: string }
  const shdwPerUsdc = Number(data.outAmount ?? '0') / 1e9
  if (!shdwPerUsdc) throw new Error('Invalid SHDW quote')
  return 1 / shdwPerUsdc
}

export async function calculateStorageForUsdc(usdcAmount: number): Promise<{
  shdwAmount: number
  storageGb: number
  storageLabel: string
  pricePerShdw: number
}> {
  const pricePerShdw = await getShdwPriceInUsdc()
  const shdwAmount = usdcAmount / pricePerShdw
  const storageGb = shdwAmount / SHDW_PER_GB
  const storageLabel = storageGb >= 1024
    ? `${(storageGb / 1024).toFixed(2)} TB`
    : `${storageGb.toFixed(2)} GB`
  return { shdwAmount, storageGb, storageLabel, pricePerShdw }
}
