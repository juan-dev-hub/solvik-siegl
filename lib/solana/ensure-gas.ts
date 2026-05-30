import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from '@solana/web3.js'

const MIN_SOL_LAMPORTS  = BigInt(Math.floor(0.05 * LAMPORTS_PER_SOL))  // 0.05 SOL
const REFILL_USDC       = 2_000_000n   // $2 USDC (micro-USDC)
const USDC_MINT         = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const WSOL_MINT         = 'So11111111111111111111111111111111111111112'

async function swapUsdcToSolExactIn(amountMicro: bigint, keypair: Keypair): Promise<void> {
  const quoteRes = await fetch(
    `https://quote-api.jup.ag/v6/quote` +
    `?inputMint=${USDC_MINT}&outputMint=${WSOL_MINT}` +
    `&amount=${amountMicro}&swapMode=ExactIn&slippageBps=100`,
  )
  if (!quoteRes.ok) throw new Error(`Jupiter gas-refill quote error: ${await quoteRes.text()}`)
  const quote = await quoteRes.json()

  const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  })
  if (!swapRes.ok) throw new Error(`Jupiter gas-refill swap error: ${await swapRes.text()}`)
  const { swapTransaction } = await swapRes.json() as { swapTransaction: string }

  const { getConnection } = await import('./connection')
  const connection = getConnection()
  const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'))
  tx.sign([keypair])
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
  await connection.confirmTransaction(sig, 'confirmed')
}

// Returns how much USDC (micro) this wallet will consume for a gas refill.
// 0n if balance is already sufficient.
export async function solRefillNeeded(walletPubkey: PublicKey, connection: Connection): Promise<bigint> {
  const balance = await connection.getBalance(walletPubkey)
  return BigInt(balance) < MIN_SOL_LAMPORTS ? REFILL_USDC : 0n
}

// Executes the USDC→SOL swap if the wallet balance is below the threshold.
// Must be called AFTER the USDC split has been sent to the wallet.
export async function refillGasIfNeeded(keypair: Keypair, connection: Connection): Promise<void> {
  const balance = await connection.getBalance(keypair.publicKey)
  if (BigInt(balance) >= MIN_SOL_LAMPORTS) return
  await swapUsdcToSolExactIn(REFILL_USDC, keypair)
}
