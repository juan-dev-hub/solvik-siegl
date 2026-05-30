import { Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { keypairIdentity, generateSigner } from '@metaplex-foundation/umi'
import { createTree, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { getConnection } from '../solana/connection'
import { supabaseAdmin } from '../supabase'

const USDC_MINT      = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const WSOL_MINT      = 'So11111111111111111111111111111111111111112'
const TRIGGER_USDC   = 5_000_000n  // $5 USDC trigger threshold
const TREE_MAX_DEPTH = 14
const TREE_BUFFER    = 64

// Check if FEE_POOL_WALLET has received the $5 USDC deposit
export async function feePoolHasTriggerAmount(): Promise<boolean> {
  const connection   = getConnection()
  const feePoolPubkey = new PublicKey(process.env.FEE_POOL_WALLET!)
  const ata = await getAssociatedTokenAddress(USDC_MINT, feePoolPubkey)
  try {
    const balance = await connection.getTokenAccountBalance(ata)
    return BigInt(balance.value.amount) >= TRIGGER_USDC
  } catch {
    return false
  }
}

// Check if a tree has already been provisioned
export async function merkleTreeProvisioned(): Promise<boolean> {
  if (process.env.MERKLE_TREE_ADDRESS) return true
  const { data } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'merkle_tree_address')
    .single()
  return !!data?.value
}

// Swap $5 USDC → SOL from OWNER_WALLET to fund tree creation
async function swapOwnerUsdcToSol(): Promise<void> {
  const secret = JSON.parse(process.env.OWNER_WALLET_SECRET!) as number[]
  const ownerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))

  const quoteRes = await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${USDC_MINT.toBase58()}` +
    `&outputMint=${WSOL_MINT}&amount=${TRIGGER_USDC}&swapMode=ExactIn&slippageBps=100`
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

// Create the shared Merkle tree from OWNER_WALLET and save address to system_config
export async function provisionMerkleTree(): Promise<string> {
  const secret = JSON.parse(process.env.OWNER_WALLET_SECRET!) as number[]
  const ownerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))

  // Fund OWNER_WALLET with SOL (swapped from its own USDC)
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
