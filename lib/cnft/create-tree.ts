import { Keypair, VersionedTransaction } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { keypairIdentity, generateSigner } from '@metaplex-foundation/umi'
import { createTree, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { getConnection } from '../solana/connection'

// Tree size per plan: deeper = more leaves but more SOL for rent
const PLAN_TREE: Record<string, { maxDepth: number; maxBufferSize: number }> = {
  starter: { maxDepth: 13, maxBufferSize: 64 },  // ~8K leaves
  pro:     { maxDepth: 14, maxBufferSize: 64 },  // ~16K leaves
  studio:  { maxDepth: 17, maxBufferSize: 64 },  // ~131K leaves
}

// Swap USDC → SOL for OWNER_WALLET using Jupiter ExactIn
// (tree rent and cNFT fees are paid in SOL from OWNER_WALLET)
export async function swapGasUsdcToSol(amountMicro: bigint): Promise<void> {
  if (amountMicro === 0n) return
  const secret = JSON.parse(process.env.OWNER_WALLET_SECRET!) as number[]
  const ownerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))

  const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  const WSOL = 'So11111111111111111111111111111111111111112'

  const quoteRes = await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${USDC}&outputMint=${WSOL}` +
    `&amount=${amountMicro}&swapMode=ExactIn&slippageBps=100`,
  )
  if (!quoteRes.ok) throw new Error(`Jupiter gas-swap quote error: ${await quoteRes.text()}`)
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
  if (!swapRes.ok) throw new Error(`Jupiter gas-swap error: ${await swapRes.text()}`)
  const { swapTransaction } = await swapRes.json() as { swapTransaction: string }

  const connection = getConnection()
  const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'))
  tx.sign([ownerKeypair])
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
  await connection.confirmTransaction(sig, 'confirmed')
}

// Create a Merkle tree for a specific user.
// OWNER_WALLET pays the rent (funded by swapGasUsdcToSol above).
// Returns the tree address to store in issuers.merkle_tree_address.
export async function createMerkleTreeForUser(planId: string): Promise<string> {
  const secret = JSON.parse(process.env.OWNER_WALLET_SECRET!) as number[]
  const ownerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))

  const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC!)
    .use(mplBubblegum())
    .use(keypairIdentity(fromWeb3JsKeypair(ownerKeypair)))

  const treeSize   = PLAN_TREE[planId] ?? PLAN_TREE.starter
  const treeSigner = generateSigner(umi)

  const builder = await createTree(umi, {
    merkleTree:    treeSigner,
    maxDepth:      treeSize.maxDepth,
    maxBufferSize: treeSize.maxBufferSize,
  })
  await builder.sendAndConfirm(umi)

  return treeSigner.publicKey.toString()
}
