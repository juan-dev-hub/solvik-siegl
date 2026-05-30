import { ShdwDrive } from '@shadow-drive/sdk'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'
import { supabaseAdmin } from './supabase'

export type ShdwUploadResult = {
  id: string  // full Shadow Drive URL: https://shdw-drive.genesysgo.net/{account}/{filename}
}

async function getIssuerStorageAccount(issuerWallet: string): Promise<PublicKey> {
  const { data } = await supabaseAdmin
    .from('issuers')
    .select('shadow_account_pubkey')
    .eq('wallet_address', issuerWallet)
    .single()
  if (!data?.shadow_account_pubkey) {
    throw new Error(`No Shadow Drive account found for issuer ${issuerWallet}. Storage setup pending.`)
  }
  return new PublicKey(data.shadow_account_pubkey)
}

export async function uploadToShdwDrive(
  data: Buffer,
  contentType: string,
  tags: Record<string, string>,
  issuerWallet: string,
): Promise<ShdwUploadResult> {
  const secret = JSON.parse(process.env.FEE_POOL_WALLET_SECRET!) as number[]
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secret))
  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')

  const drive = await new ShdwDrive(connection, keypair).init()
  const storageAccount = await getIssuerStorageAccount(issuerWallet)

  const ext = contentType.split('/').pop() ?? 'bin'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const file = new File([data as unknown as BlobPart], filename, { type: contentType })
  const result = await drive.uploadFile(storageAccount, file)

  if (result.upload_errors?.length) {
    throw new Error(`Shadow Drive upload failed: ${result.upload_errors[0]}`)
  }

  const url = result.finalized_locations?.[0] ?? result.message
  if (!url) throw new Error('Shadow Drive upload returned no URL')

  return { id: url }
}
