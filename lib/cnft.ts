import { Keypair, PublicKey } from '@solana/web3.js'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { keypairIdentity } from '@metaplex-foundation/umi'
import {
  mintV1,
  mplBubblegum,
} from '@metaplex-foundation/mpl-bubblegum'
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import bs58 from 'bs58'

const MERKLE_TREE_ADDRESS = process.env.MERKLE_TREE_ADDRESS

function getIssuerKeypair(): Keypair {
  const secret = JSON.parse(process.env.ISSUER_WALLET_SECRET!) as number[]
  return Keypair.fromSecretKey(Uint8Array.from(secret))
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

  if (!MERKLE_TREE_ADDRESS) {
    throw new Error('MERKLE_TREE_ADDRESS not set')
  }

  const treeAddress = new PublicKey(MERKLE_TREE_ADDRESS)

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
