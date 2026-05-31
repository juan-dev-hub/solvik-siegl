import { Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { keypairIdentity, generateSigner, publicKey } from '@metaplex-foundation/umi'
import { createTree, mplBubblegum, fetchTreeConfigFromSeeds } from '@metaplex-foundation/mpl-bubblegum'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { getConnection } from '../solana/connection'
import { supabaseAdmin } from '../supabase'

const USDC_MINT       = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const WSOL_MINT       = 'So11111111111111111111111111111111111111112'
const TREE_COST_USDC  = 10_000_000n  // $10 USDC per tree
const TREE_MAX_DEPTH  = 14
const TREE_BUFFER     = 64
const TREE_CAPACITY   = 2 ** TREE_MAX_DEPTH  // 16,384 NFTs
const FULL_THRESHOLD  = 0.85

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

// Returns true if FEE_POOL_WALLET has at least $10 USDC available
export async function feePoolHasTriggerAmount(): Promise<boolean> {
  const connection    = getConnection()
  const feePoolPubkey = new PublicKey(process.env.FEE_POOL_WALLET!)
  const ata = await getAssociatedTokenAddress(USDC_MINT, feePoolPubkey)
  try {
    const balance = await connection.getTokenAccountBalance(ata)
    return BigInt(balance.value.amount) >= TREE_COST_USDC
  } catch {
    return false
  }
}

// Swap $10 USDC → SOL from OWNER_WALLET to fund tree creation
async function swapOwnerUsdcToSol(): Promise<void> {
  const secret = JSON.parse(process.env.OWNER_WALLET_SECRET!) as number[]
  const ownerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))

  const quoteRes = await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${USDC_MINT.toBase58()}` +
    `&outputMint=${WSOL_MINT}&amount=${TREE_COST_USDC}&swapMode=ExactIn&slippageBps=100`
  )
  if (!quoteRes.ok) throw new Error(`Jupiter quote error: ${await quoteRes.text()}`)
  const quote = await quoteRes.json()

  const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: ownerKeypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  })
  if (!swapRes.ok) throw new Error(`Jupiter swap error: ${await swapRes.text()}`)
  const { swapTransaction } = await swapRes.json() as { swapTransaction: string }

  const connection = getConnection()
  const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'))
  tx.sign([ownerKeypair])
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
  await connection.confirmTransaction(sig, 'confirmed')
}

// Create a new Merkle tree, swap $10 USDC → SOL to pay for it, and set it as the active tree
export async function provisionMerkleTree(): Promise<string> {
  const secret = JSON.parse(process.env.OWNER_WALLET_SECRET!) as number[]
  const ownerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))

  await swapOwnerUsdcToSol()

  const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC!)
    .use(mplBubblegum())
    .use(keypairIdentity(fromWeb3JsKeypair(ownerKeypair)))

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
