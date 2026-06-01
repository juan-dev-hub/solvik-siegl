import { Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { keypairIdentity, generateSigner, publicKey } from '@metaplex-foundation/umi'
import { createTree, mplBubblegum, fetchTreeConfigFromSeeds } from '@metaplex-foundation/mpl-bubblegum'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { getConnection } from '../solana/connection'
import { supabaseAdmin } from '../supabase'

const USDC_MINT          = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const WSOL_MINT          = 'So11111111111111111111111111111111111111112'
const FIRST_TREE_COST    = 5_000_000n   // $5 USDC — primer árbol
const FIRST_TREE_TRIGGER = 6_000_000n   // $6 USDC en FEE_POOL para activar ($5 + $1 fee swap)
const NEXT_TREE_COST     = 10_000_000n  // $10 USDC — árboles subsiguientes
const NEXT_TREE_TRIGGER  = 11_000_000n  // $11 USDC en FEE_POOL ($10 + $1 fee swap)
const TREE_MAX_DEPTH     = 14
const TREE_BUFFER        = 64
const TREE_CAPACITY      = 2 ** TREE_MAX_DEPTH  // 16,384 NFTs
const FULL_THRESHOLD     = 0.85

export async function getCurrentTreeAddress(): Promise<string | null> {
  if (process.env.MERKLE_TREE_ADDRESS) return process.env.MERKLE_TREE_ADDRESS
  const { data } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'merkle_tree_address')
    .single()
  return data?.value ?? null
}

// Returns true if there is no active tree yet (first-time setup)
export async function merkleTreeProvisioned(): Promise<boolean> {
  return !!(await getCurrentTreeAddress())
}

// Returns true if the current tree has reached 85% of its capacity
export async function isCurrentTreeNearlyFull(): Promise<boolean> {
  const treeAddress = await getCurrentTreeAddress()
  if (!treeAddress) return false

  const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC!).use(mplBubblegum())
  const config = await fetchTreeConfigFromSeeds(umi, { merkleTree: publicKey(treeAddress) })
  const usageRatio = Number(config.numMinted) / TREE_CAPACITY
  return usageRatio >= FULL_THRESHOLD
}

// isFirst=true → chequea $6 (primer árbol), false → $11 (subsiguientes)
export async function feePoolHasTriggerAmount(isFirst = false): Promise<boolean> {
  const threshold  = isFirst ? FIRST_TREE_TRIGGER : NEXT_TREE_TRIGGER
  const connection = getConnection()
  const feePoolPubkey = new PublicKey(process.env.FEE_POOL_WALLET!)
  const ata = await getAssociatedTokenAddress(USDC_MINT, feePoolPubkey)
  try {
    const balance = await connection.getTokenAccountBalance(ata)
    return BigInt(balance.value.amount) >= threshold
  } catch {
    return false
  }
}

// Swap USDC → SOL desde FEE_POOL_WALLET para fondear la creación del árbol.
// No requiere OWNER_WALLET_SECRET — usa FEE_POOL_WALLET_SECRET que ya está en env.
async function swapFeePoolUsdcToSol(amount: bigint): Promise<void> {
  const secret = JSON.parse(process.env.FEE_POOL_WALLET_SECRET!) as number[]
  const feePoolKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))

  const quoteRes = await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${USDC_MINT.toBase58()}` +
    `&outputMint=${WSOL_MINT}&amount=${amount}&swapMode=ExactIn&slippageBps=100`
  )
  if (!quoteRes.ok) throw new Error(`Jupiter quote error: ${await quoteRes.text()}`)
  const quote = await quoteRes.json()

  const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: feePoolKeypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  })
  if (!swapRes.ok) throw new Error(`Jupiter swap error: ${await swapRes.text()}`)
  const { swapTransaction } = await swapRes.json() as { swapTransaction: string }

  const connection = getConnection()
  const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'))
  tx.sign([feePoolKeypair])
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
  await connection.confirmTransaction(sig, 'confirmed')
}

// Crear árbol de Merkle: swap USDC→SOL desde FEE_POOL y desplegarlo on-chain.
// isFirst=true → $5 USDC swap, false → $10 USDC swap
export async function provisionMerkleTree(isFirst = false): Promise<string> {
  const secret = JSON.parse(process.env.FEE_POOL_WALLET_SECRET!) as number[]
  const feePoolKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))

  const swapAmount = isFirst ? FIRST_TREE_COST : NEXT_TREE_COST
  await swapFeePoolUsdcToSol(swapAmount)

  const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC!)
    .use(mplBubblegum())
    .use(keypairIdentity(fromWeb3JsKeypair(feePoolKeypair)))

  const treeSigner = generateSigner(umi)
  const builder = await createTree(umi, {
    merkleTree:    treeSigner,
    maxDepth:      TREE_MAX_DEPTH,
    maxBufferSize: TREE_BUFFER,
  })
  await builder.sendAndConfirm(umi)

  const address = treeSigner.publicKey.toString()

  await supabaseAdmin
    .from('system_config')
    .upsert({ key: 'merkle_tree_address', value: address }, { onConflict: 'key' })

  return address
}
