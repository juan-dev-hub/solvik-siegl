import {
  Keypair, PublicKey, Transaction,
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
import { UserInfo, StorageConfig } from '@shadow-drive/sdk'
import { getConnection } from '../solana/connection'

// ─── Shadow Drive constants ───────────────────────────────────────────────────
const SHDW_PROGRAM_ID = new PublicKey('2e1wdyNhUvE76y6yUCvah2KaviavMJYKoRun8acMRBZZ')
const SHDW_MINT       = new PublicKey('SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y')
const SHDW_UPLOADER   = new PublicKey('972oJTFyjmVNsWM4GHEGPWUomAiJf2qrVotLtwnKmWem')
const SHDW_DECIMALS   = 9
const USDC_MINT       = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

export const SHDW_DRIVE_API = 'https://shadow-storage.genesysgo.net'

// ─── initializeAccount2 instruction builder ───────────────────────────────────
const INIT2_DISCRIMINATOR = Buffer.from([8, 182, 149, 144, 185, 31, 209, 105])
const INIT2_LAYOUT = borsh.struct([borsh.str('identifier'), borsh.u64('storage')])

function buildInitAccount2Ix(
  args:     { identifier: string; storage: BN },
  accounts: {
    storageConfig: PublicKey; userInfo: PublicKey; storageAccount: PublicKey
    stakeAccount: PublicKey; owner1: PublicKey; owner1TokenAccount: PublicKey
  },
): TransactionInstruction {
  const buf = Buffer.alloc(1000)
  const len = INIT2_LAYOUT.encode(args, buf)
  const data = Buffer.concat([INIT2_DISCRIMINATOR, buf]).slice(0, 8 + len)
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
const PLAN_STORAGE_GIB: Record<string, number> = {
  starter:  1,
  pro:      5,
  studio:  20,
}

// ─── Step 1: get exact SHDW cost + ExactOut Jupiter quote ────────────────────
// Must be called BEFORE executing the split so the caller can adjust amounts.
export type ShadowQuote = {
  shdwLamports: bigint       // exact SHDW needed for the storage account
  usdcNeeded:   bigint       // exact USDC needed for the swap (ExactOut)
  quoteResponse: unknown     // raw Jupiter quote — pass to executeSwapAndBuildTx
}

export async function getShadowQuote(planId: string): Promise<ShadowQuote> {
  const connection = getConnection()

  // Read current price from storageConfig PDA
  const [storageConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('storage-config')], SHDW_PROGRAM_ID,
  )
  const storageConfig = await StorageConfig.fetch(connection, storageConfigPDA)
  if (!storageConfig) throw new Error('Could not fetch Shadow Drive storageConfig')

  const gib = PLAN_STORAGE_GIB[planId] ?? 1
  // shadesPerGib is already in SHDW lamports (shades = 10^-9 SHDW)
  const shdwLamports = BigInt(storageConfig.shadesPerGib.toString()) * BigInt(gib)

  // Jupiter ExactOut: how much USDC do we need to get exactly shdwLamports?
  const quoteRes = await fetch(
    `https://quote-api.jup.ag/v6/quote` +
    `?inputMint=${USDC_MINT.toBase58()}` +
    `&outputMint=${SHDW_MINT.toBase58()}` +
    `&amount=${shdwLamports}` +
    `&swapMode=ExactOut` +
    `&slippageBps=100`,
  )
  if (!quoteRes.ok) throw new Error(`Jupiter ExactOut quote error: ${await quoteRes.text()}`)
  const quoteResponse = await quoteRes.json() as Record<string, unknown>

  const usdcNeeded = BigInt(quoteResponse.inAmount as string)
  return { shdwLamports, usdcNeeded, quoteResponse }
}

// ─── Step 2: execute swap + transfer SHDW to user + build unsigned tx ─────────
// Called after the split has been executed (SHADOW_WALLET already holds usdcNeeded).
export async function executeSwapAndBuildTx(
  userWalletPubkey: string,
  shdwLamports:     bigint,
  quoteResponse:    unknown,
): Promise<string> {
  const secret = JSON.parse(process.env.SHADOW_WALLET_SECRET!) as number[]
  const shadowKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))
  const connection = getConnection()
  const userWallet = new PublicKey(userWalletPubkey)

  // ExactOut swap: SHADOW_WALLET USDC → exactly shdwLamports SHDW
  const swapRes = await fetch('https://quote-api.jup.ag/v6/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: shadowKeypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  })
  if (!swapRes.ok) throw new Error(`Jupiter swap error: ${await swapRes.text()}`)
  const { swapTransaction } = await swapRes.json() as { swapTransaction: string }

  const swapTx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'))
  swapTx.sign([shadowKeypair])
  const swapSig = await connection.sendRawTransaction(swapTx.serialize(), { skipPreflight: false })
  await connection.confirmTransaction(swapSig, 'confirmed')

  // Transfer all SHDW from SHADOW_WALLET to user's ATA
  const shadowShdwAta = await getAssociatedTokenAddress(SHDW_MINT, shadowKeypair.publicKey)
  const userShdwAta   = await getAssociatedTokenAddress(SHDW_MINT, userWallet)
  const balInfo = await connection.getTokenAccountBalance(shadowShdwAta)
  const shdwBalance = BigInt(balInfo.value.amount)

  const fundTx = new Transaction()
  fundTx.add(createAssociatedTokenAccountIdempotentInstruction(
    shadowKeypair.publicKey, userShdwAta, userWallet, SHDW_MINT,
  ))
  fundTx.add(createTransferCheckedInstruction(
    shadowShdwAta, SHDW_MINT, userShdwAta, shadowKeypair.publicKey, shdwBalance, SHDW_DECIMALS,
  ))
  fundTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  fundTx.feePayer = shadowKeypair.publicKey
  fundTx.sign(shadowKeypair)
  const fundSig = await connection.sendRawTransaction(fundTx.serialize(), { skipPreflight: false })
  await connection.confirmTransaction(fundSig, 'confirmed')

  // Derive PDAs for user's new storage account
  const [storageConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('storage-config')], SHDW_PROGRAM_ID,
  )
  const [userInfoPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('user-info'), userWallet.toBytes()], SHDW_PROGRAM_ID,
  )
  const userInfoAccount = await UserInfo.fetch(connection, userInfoPDA)
  const accountSeed = new BN(userInfoAccount?.accountCounter ?? 0)

  const [storageAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('storage-account'), userWallet.toBytes(), accountSeed.toTwos(2).toArrayLike(Buffer, 'le', 4)],
    SHDW_PROGRAM_ID,
  )
  const [stakeAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from('stake-account'), storageAccount.toBytes()], SHDW_PROGRAM_ID,
  )

  // Build initializeAccount2 with user as owner1 (authority)
  const ix = buildInitAccount2Ix(
    {
      identifier: `solvik-${userWalletPubkey.slice(0, 8)}`,
      storage: new BN(shdwLamports.toString()),
    },
    {
      storageConfig:      storageConfigPDA,
      userInfo:           userInfoPDA,
      storageAccount,
      stakeAccount,
      owner1:             userWallet,
      owner1TokenAccount: userShdwAta,
    },
  )

  const setupTx = new Transaction()
  setupTx.add(ix)
  setupTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  setupTx.feePayer = userWallet

  // User signs with Phantom, Shadow Drive API adds uploader sig and broadcasts
  return setupTx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')
}
