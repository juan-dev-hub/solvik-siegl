import { Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js'
import { ShdwDrive } from '@shadow-drive/sdk'
import { getConnection } from '../solana/connection'
import { supabaseAdmin } from '../supabase'

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const SHDW_MINT = 'SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y'

const PLAN_STORAGE_SIZE: Record<string, string> = {
  starter: '1GB',
  pro:     '5GB',
  studio:  '20GB',
}

async function swapUsdcToShdw(amountMicro: bigint, keypair: Keypair): Promise<void> {
  const quoteRes = await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${USDC_MINT}&outputMint=${SHDW_MINT}&amount=${amountMicro}&slippageBps=100`
  )
  if (!quoteRes.ok) throw new Error(`Jupiter quote error: ${await quoteRes.text()}`)
  const quote = await quoteRes.json() as Record<string, unknown>

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
  if (!swapRes.ok) throw new Error(`Jupiter swap error: ${await swapRes.text()}`)
  const { swapTransaction } = await swapRes.json() as { swapTransaction: string }

  const connection = getConnection()
  const tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'))
  tx.sign([keypair])

  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
  await connection.confirmTransaction(sig, 'confirmed')
}

async function getShadowAccount(): Promise<string | null> {
  if (process.env.SHADOW_DRIVE_ACCOUNT) return process.env.SHADOW_DRIVE_ACCOUNT
  const { data } = await supabaseAdmin
    .from('system_config')
    .select('value')
    .eq('key', 'shadow_drive_account')
    .single()
  return data?.value ?? null
}

// Called on first subscription payment — swaps USDC → SHDW and provisions storage
export async function provisionShadowStorage(
  usdcAmount: bigint,
  planId: string
): Promise<void> {
  const secret = JSON.parse(process.env.SHADOW_WALLET_SECRET!) as number[]
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secret))
  const connection = getConnection()

  await swapUsdcToShdw(usdcAmount, keypair)

  const drive = await new ShdwDrive(connection, keypair).init()
  const size = PLAN_STORAGE_SIZE[planId] ?? '1GB'
  const existing = await getShadowAccount()

  if (existing) {
    await drive.addStorage(new PublicKey(existing), size)
  } else {
    const result = await drive.createStorageAccount('solvik-certs', size)
    await supabaseAdmin
      .from('system_config')
      .upsert({ key: 'shadow_drive_account', value: result.shdw_bucket })
  }
}
