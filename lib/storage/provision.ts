import {
  Connection, Keypair, PublicKey, Transaction,
  SystemProgram, SYSVAR_RENT_PUBKEY, VersionedTransaction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { BN } from '@coral-xyz/anchor'
// Use the SDK's internal instruction builder — discriminator & borsh layout already verified
import { initializeAccount2 } from '@shadow-drive/sdk/dist/types/instructions'
import { tokenMint as SHDW_MINT, uploader as UPLOADER } from '@shadow-drive/sdk/dist/utils/common'
import { PROGRAM_ID as SHDW_PROGRAM_ID } from '@shadow-drive/sdk/dist/types/programId'
import { UserInfo } from '@shadow-drive/sdk/dist/types/accounts'
import { getConnection } from '../solana/connection'

const SHDW_DECIMALS = 9
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

const PLAN_STORAGE_BYTES: Record<string, number> = {
  starter:  1  * 1024 * 1024 * 1024,
  pro:      5  * 1024 * 1024 * 1024,
  studio:   20 * 1024 * 1024 * 1024,
}

// ─── Jupiter: USDC → SHDW ────────────────────────────────────────────────────
async function swapUsdcToShdw(amountMicro: bigint, keypair: Keypair): Promise<void> {
  const quoteRes = await fetch(
    `https://quote-api.jup.ag/v6/quote?inputMint=${USDC_MINT.toBase58()}&outputMint=${SHDW_MINT.toBase58()}&amount=${amountMicro}&slippageBps=100`
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

// ─── Transfer SHDW from SHADOW_WALLET to user's ATA ─────────────────────────
async function fundUserShdwAta(
  userWallet: PublicKey,
  shadowKeypair: Keypair,
  connection: Connection,
): Promise<void> {
  const shadowAta = await getAssociatedTokenAddress(SHDW_MINT, shadowKeypair.publicKey)
  const userAta   = await getAssociatedTokenAddress(SHDW_MINT, userWallet)

  const balInfo = await connection.getTokenAccountBalance(shadowAta)
  const amount  = BigInt(balInfo.value.amount)
  if (amount === 0n) throw new Error('SHADOW_WALLET has no SHDW after swap')

  const tx = new Transaction()
  tx.add(createAssociatedTokenAccountIdempotentInstruction(
    shadowKeypair.publicKey, userAta, userWallet, SHDW_MINT,
  ))
  tx.add(createTransferCheckedInstruction(
    shadowAta, SHDW_MINT, userAta, shadowKeypair.publicKey, amount, SHDW_DECIMALS,
  ))
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  tx.feePayer = shadowKeypair.publicKey
  tx.sign(shadowKeypair)

  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
  await connection.confirmTransaction(sig, 'confirmed')
}

// ─── Derive Shadow Drive PDAs for a given owner ──────────────────────────────
async function deriveStoragePDAs(owner: PublicKey, connection: Connection) {
  const [storageConfigPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('storage-config')], SHDW_PROGRAM_ID,
  )
  const [userInfoPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('user-info'), owner.toBytes()], SHDW_PROGRAM_ID,
  )
  const userInfoAccount = await UserInfo.fetch(connection, userInfoPDA)
  const accountSeed = new BN(userInfoAccount?.accountCounter ?? 0)

  const [storageAccount] = await PublicKey.findProgramAddress(
    [Buffer.from('storage-account'), owner.toBytes(), accountSeed.toTwos(2).toArrayLike(Buffer, 'le', 4)],
    SHDW_PROGRAM_ID,
  )
  const [stakeAccount] = await PublicKey.findProgramAddress(
    [Buffer.from('stake-account'), storageAccount.toBytes()], SHDW_PROGRAM_ID,
  )
  return { storageConfigPDA, userInfoPDA, storageAccount, stakeAccount }
}

// ─── Public: build the unsigned setup transaction ────────────────────────────
// Returns a base64 transaction that the frontend sends to Phantom for signing,
// then POSTs to https://shadow-storage.genesysgo.net/storage-account
export async function buildShadowSetupTx(
  userWalletPubkey: string,
  shadowAmountMicro: bigint,
  planId: string,
): Promise<string> {
  const secret = JSON.parse(process.env.SHADOW_WALLET_SECRET!) as number[]
  const shadowKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))
  const connection = getConnection()
  const userWallet = new PublicKey(userWalletPubkey)

  // Step 1: swap USDC → SHDW into SHADOW_WALLET
  await swapUsdcToShdw(shadowAmountMicro, shadowKeypair)

  // Step 2: send all SHDW from SHADOW_WALLET to user's ATA
  await fundUserShdwAta(userWallet, shadowKeypair, connection)

  // Step 3: derive PDAs for the user's new storage account
  const { storageConfigPDA, userInfoPDA, storageAccount, stakeAccount } =
    await deriveStoragePDAs(userWallet, connection)

  const userShdwAta = await getAssociatedTokenAddress(SHDW_MINT, userWallet)
  const storageBytes = PLAN_STORAGE_BYTES[planId] ?? PLAN_STORAGE_BYTES.starter

  // Step 4: build initializeAccount2 with user as owner1 (authority)
  const ix = initializeAccount2(
    {
      identifier: `solvik-${userWalletPubkey.slice(0, 8)}`,
      storage: new BN(storageBytes),
    },
    {
      storageConfig:      storageConfigPDA,
      userInfo:           userInfoPDA,
      storageAccount,
      stakeAccount,
      tokenMint:          SHDW_MINT,
      owner1:             userWallet,    // user is the authority
      uploader:           UPLOADER,      // signed server-side by Shadow Drive API
      owner1TokenAccount: userShdwAta,   // SHDW comes from here (we funded it above)
      systemProgram:      SystemProgram.programId,
      tokenProgram:       TOKEN_PROGRAM_ID,
      rent:               SYSVAR_RENT_PUBKEY,
    },
  )

  const tx = new Transaction()
  tx.add(ix)
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  tx.feePayer = userWallet

  // Serialize without signatures — user signs with Phantom, Shadow Drive API adds uploader sig
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')
}
