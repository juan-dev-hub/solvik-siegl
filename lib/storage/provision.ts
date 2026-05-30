import {
  Connection, Keypair, PublicKey, Transaction,
  SystemProgram, SYSVAR_RENT_PUBKEY, VersionedTransaction,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { BN } from '@coral-xyz/anchor'
import * as borsh from '@coral-xyz/borsh'
import { UserInfo } from '@shadow-drive/sdk'
import { getConnection } from '../solana/connection'

// ─── Shadow Drive constants (extracted from SDK internals) ────────────────────
const SHDW_PROGRAM_ID  = new PublicKey('2e1wdyNhUvE76y6yUCvah2KaviavMJYKoRun8acMRBZZ')
const SHDW_MINT        = new PublicKey('SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y')
const SHDW_UPLOADER    = new PublicKey('972oJTFyjmVNsWM4GHEGPWUomAiJf2qrVotLtwnKmWem')
const SHDW_DRIVE_API   = 'https://shadow-storage.genesysgo.net'
const SHDW_DECIMALS    = 9

// initializeAccount2 discriminator: sha256("global:initialize_account2")[0..8]
const INIT_ACCOUNT2_DISCRIMINATOR = Buffer.from([8, 182, 149, 144, 185, 31, 209, 105])
const INIT_ACCOUNT2_LAYOUT = borsh.struct([borsh.str('identifier'), borsh.u64('storage')])

function buildInitializeAccount2Ix(
  args:     { identifier: string; storage: BN },
  accounts: {
    storageConfig: PublicKey; userInfo: PublicKey; storageAccount: PublicKey
    stakeAccount: PublicKey; owner1: PublicKey; owner1TokenAccount: PublicKey
  },
): TransactionInstruction {
  const buf = Buffer.alloc(1000)
  const len = INIT_ACCOUNT2_LAYOUT.encode(args, buf)
  const data = Buffer.concat([INIT_ACCOUNT2_DISCRIMINATOR, buf]).slice(0, 8 + len)

  return new TransactionInstruction({
    programId: SHDW_PROGRAM_ID,
    keys: [
      { pubkey: accounts.storageConfig,      isSigner: false, isWritable: true  },
      { pubkey: accounts.userInfo,           isSigner: false, isWritable: true  },
      { pubkey: accounts.storageAccount,     isSigner: false, isWritable: true  },
      { pubkey: accounts.stakeAccount,       isSigner: false, isWritable: true  },
      { pubkey: SHDW_MINT,                   isSigner: false, isWritable: false },
      { pubkey: accounts.owner1,             isSigner: true,  isWritable: true  },
      { pubkey: SHDW_UPLOADER,               isSigner: true,  isWritable: false },
      { pubkey: accounts.owner1TokenAccount, isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId,     isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID,            isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY,          isSigner: false, isWritable: false },
    ],
    data,
  })
}

// ─── Plan storage sizes ───────────────────────────────────────────────────────
const PLAN_STORAGE_BYTES: Record<string, number> = {
  starter:  1  * 1024 * 1024 * 1024,
  pro:      5  * 1024 * 1024 * 1024,
  studio:   20 * 1024 * 1024 * 1024,
}

// ─── Jupiter: swap USDC → SHDW into shadow keypair ───────────────────────────
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

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

// ─── Transfer all SHDW from shadow wallet to user's ATA ──────────────────────
async function fundUserShdwAta(
  userWallet:    PublicKey,
  shadowKeypair: Keypair,
  connection:    Connection,
): Promise<void> {
  const shadowAta = await getAssociatedTokenAddress(SHDW_MINT, shadowKeypair.publicKey)
  const userAta   = await getAssociatedTokenAddress(SHDW_MINT, userWallet)
  const balInfo   = await connection.getTokenAccountBalance(shadowAta)
  const amount    = BigInt(balInfo.value.amount)
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

// ─── Public: swap + fund + build unsigned setup tx ───────────────────────────
// Returns base64 tx → frontend signs with Phantom → POST to SHDW_DRIVE_API/storage-account
export { SHDW_DRIVE_API }

export async function buildShadowSetupTx(
  userWalletPubkey: string,
  shadowAmountMicro: bigint,
  planId: string,
): Promise<string> {
  const secret = JSON.parse(process.env.SHADOW_WALLET_SECRET!) as number[]
  const shadowKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))
  const connection = getConnection()
  const userWallet = new PublicKey(userWalletPubkey)

  await swapUsdcToShdw(shadowAmountMicro, shadowKeypair)
  await fundUserShdwAta(userWallet, shadowKeypair, connection)

  const { storageConfigPDA, userInfoPDA, storageAccount, stakeAccount } =
    await deriveStoragePDAs(userWallet, connection)

  const userShdwAta    = await getAssociatedTokenAddress(SHDW_MINT, userWallet)
  const storageBytes   = PLAN_STORAGE_BYTES[planId] ?? PLAN_STORAGE_BYTES.starter

  const ix = buildInitializeAccount2Ix(
    { identifier: `solvik-${userWalletPubkey.slice(0, 8)}`, storage: new BN(storageBytes) },
    {
      storageConfig:      storageConfigPDA,
      userInfo:           userInfoPDA,
      storageAccount,
      stakeAccount,
      owner1:             userWallet,
      owner1TokenAccount: userShdwAta,
    },
  )

  const tx = new Transaction()
  tx.add(ix)
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  tx.feePayer = userWallet

  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')
}
