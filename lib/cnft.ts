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

async function getMerkleTreeAddress(): Promise<PublicKey> {
  if (process.env.MERKLE_TREE_ADDRESS) return new PublicKey(process.env.MERKLE_TREE_ADDRESS)
  const { data } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'merkle_tree_address')
    .single()
  if (data?.value) return new PublicKey(data.value)
  throw new Error('Merkle tree not provisioned yet. Deposit $5 USDC to FEE_POOL_WALLET to trigger setup.')
}

export async function mintCNFT(params: {
  name: string
  symbol: string
  uri: string
  recipientAddress: string
}): Promise<string> {
  const issuerKeypair = getIssuerKeypair()
  const umi = createUmi(process.env.NEXT_PUBLIC_SOLANA_RPC!)
    .use(mplBubblegum())
    .use(mplTokenMetadata())
    .use(keypairIdentity(fromWeb3JsKeypair(issuerKeypair)))

  const treeAddress = await getMerkleTreeAddress()

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
