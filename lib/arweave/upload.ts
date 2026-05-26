import { TurboFactory, HexSolanaSigner } from '@ardrive/turbo-sdk/node'
import { Keypair } from '@solana/web3.js'
import { Readable } from 'stream'

function getFeePoolKeypair(): Keypair {
  const secret = JSON.parse(process.env.FEE_POOL_WALLET_SECRET!) as number[]
  return Keypair.fromSecretKey(Uint8Array.from(secret))
}

export type ArweaveUploadResult = {
  id: string
  dataCaches: string[]
  fastFinalityIndexes: string[]
}

export async function uploadToArweave(
  data: Buffer,
  contentType: string,
  tags: Record<string, string>
): Promise<ArweaveUploadResult> {
  const keypair = getFeePoolKeypair()
  const hexKey = Buffer.from(keypair.secretKey).toString('hex')

  const turbo = TurboFactory.authenticated({
    signer: new HexSolanaSigner(hexKey),
    token: 'solana',
  })

  const arweaveTags = Object.entries(tags).map(([name, value]) => ({ name, value }))
  arweaveTags.push({ name: 'Content-Type', value: contentType })
  arweaveTags.push({ name: 'App-Name', value: 'Solvik Studio' })

  const result = await turbo.uploadFile({
    fileStreamFactory: () => Readable.from(data),
    fileSizeFactory: () => data.length,
    signal: AbortSignal.timeout(60_000),
    dataItemOpts: { tags: arweaveTags },
  })

  return result as ArweaveUploadResult
}
