import { Keypair, PublicKey } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { keypairIdentity } from '@metaplex-foundation/umi'
import { mintV1, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum'
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { supabaseAdmin } from './supabase'
import bs58 from 'bs58'

function getIssuerKeypair(): Keypair {
  const secret = JSON.parse(process.env.ISSUER_WALLET_SECRET!) as number[]
  return Keypair.fromSecretKey(Uint8Array.from(secret))
}

async function getMerkleTree(issuerWallet: string): Promise<PublicKey> {
  // Look up per-user tree first
  const { data } = await supabaseAdmin
    .from('issuers')
    .select('merkle_tree_address')
    .eq('wallet_address', issuerWallet)
    .single()

  if (data?.merkle_tree_address) return new PublicKey(data.merkle_tree_address)

  // Fallback to global env var (legacy / testing)
  if (process.env.MERKLE_TREE_ADDRESS) return new PublicKey(process.env.MERKLE_TREE_ADDRESS)

  throw new Error(`No Merkle tree configured for issuer ${issuerWallet}`)
}

export async function mintCNFT(params: {
  name: string
  symbol: string
  uri: string
  recipientAddress: string
  issuerWallet: string
}): Promise<string> {
  const issuerKeypair = getIssuerKeypair()
  const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC!)
    .use(mplBubblegum())
    .use(mplTokenMetadata())
    .use(keypairIdentity(fromWeb3JsKeypair(issuerKeypair)))

  const treeAddress = await getMerkleTree(params.issuerWallet)

  const { signature } = await mintV1(umi, {
    leafOwner: umi.identity.publicKey,
    merkleTree: treeAddress as unknown as Parameters<typeof mintV1>[1]['merkleTree'],
    metadata: {
      name: params.name,
      symbol: 'SVKS',
      uri: params.uri,
      sellerFeeBasisPoints: 0,
      collection: { key: umi.identity.publicKey, verified: false },
      creators: [{ address: umi.identity.publicKey, verified: true, share: 100 }],
    },
  }).sendAndConfirm(umi)

  return bs58.encode(signature)
}
