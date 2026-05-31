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
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import { BN } from '@coral-xyz/anchor'
import * as borsh from '@coral-xyz/borsh'
import { UserInfo, StorageConfig } from '@shadow-drive/sdk'
import { getConnection } from '../solana/connection'

const SHDW_EMISSIONS_WALLET = new PublicKey('SHDWRWMZ6kmRG9CvKFSD7kVcnUqXMtd3SaMrLvWscbj')

// makeAccountImmutable2 instruction — discriminator from Shadow Drive SDK source
const MAKE_IMMUTABLE_DISCRIMINATOR = Buffer.from([67, 217, 126, 253, 69, 164, 84, 139])
const MAKE_IMMUTABLE_LAYOUT = borsh.struct([borsh.u64('storageUsed')])

function buildMakeImmutableIx(
  storageUsed: BN,
  accounts: {
    storageConfig: PublicKey; storageAccount: PublicKey; stakeAccount: PublicKey
    emissionsWallet: PublicKey; owner: PublicKey; ownerAta: PublicKey
    tokenMint: PublicKey
  },
): TransactionInstruction {
  const buf = Buffer.alloc(8)
  MAKE_IMMUTABLE_LAYOUT.encode({ storageUsed }, buf)
  const data = Buffer.concat([MAKE_IMMUTABLE_DISCRIMINATOR, buf])
  return new TransactionInstruction({
    programId: SHDW_PROGRAM_ID,
    keys: [
      { pubkey: accounts.storageConfig,   isSigner: false, isWritable: true  },
      { pubkey: accounts.storageAccount,  isSigner: false, isWritable: true  },
      { pubkey: accounts.stakeAccount,    isSigner: false, isWritable: true  },
      { pubkey: accounts.emissionsWallet, isSigner: false, isWritable: true  },
      { pubkey: accounts.owner,           isSigner: true,  isWritable: true  },
      { pubkey: accounts.ownerAta,        isSigner: false, isWritable: true  },
      { pubkey: SHDW_UPLOADER,            isSigner: true,  isWritable: false },
      { pubkey: accounts.tokenMint,       isSigner: false, isWritable: true  },
      { pubkey: SystemProgram.programId,  isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID,         isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY,       isSigner: false, isWritable: false },
    ],
    data,
  })
}

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

// ─── Step 1: quote how much SHDW (and bytes) a USDC budget buys ──────────────
export type ShadowQuote = {
  shdwLamports:  bigint   // SHDW to receive (estimated; actual checked post-swap)
  usdcNeeded:    bigint   // same as usdcBudget — spent ExactIn
  actualBytes:   bigint   // bytes of Shadow Drive storage purchased
  quoteResponse: unknown  // raw Jupiter quote — pass to executeSwapAndBuildTx
}

export async function getShadowQuote(usdcBudget: bigint): Promise<ShadowQuote> {
  const connection = getConnection()

  const [storageConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('storage-config')], SHDW_PROGRAM_ID,
  )
  const storageConfig = await StorageConfig.fetch(connection, storageConfigPDA)
  if (!storageConfig) throw new Error('Could not fetch Shadow Drive storageConfig')

  // ExactIn: spend exactly usdcBudget USDC, get as much SHDW as possible
  const quoteRes = await fetch(
    `https://quote-api.jup.ag/v6/quote` +
    `?inputMint=${USDC_MINT.toBase58()}` +
    `&outputMint=${SHDW_MINT.toBase58()}` +
    `&amount=${usdcBudget}` +
    `&swapMode=ExactIn` +
    `&slippageBps=100`,
  )
  if (!quoteRes.ok) throw new Error(`Jupiter ExactIn quote error: ${await quoteRes.text()}`)
  const quoteResponse = await quoteRes.json() as Record<string, unknown>

  const shdwLamports = BigInt(quoteResponse.outAmount as string)

  // Convert SHDW lamports → bytes using current Shadow Drive price
  const GIB_BYTES     = 1_073_741_824n  // 1 GiB in bytes
  const shadesPerGib  = BigInt(storageConfig.shadesPerGib.toString())
  const actualBytes   = (shdwLamports * GIB_BYTES) / shadesPerGib

  return { shdwLamports, usdcNeeded: usdcBudget, actualBytes, quoteResponse }
}

export type ShadowSetupTxs = {
  shadowSetupTx:   string  // initializeAccount2 — crea la cuenta mutable
  makeImmutableTx: string  // makeAccountImmutable2 — la bloquea inmediatamente
}

// ─── Step 2: swap USDC→SHDW, construir tx de creación e inmutabilidad ─────────
export async function executeSwapAndBuildTx(
  userWalletPubkey: string,
  shdwLamports:     bigint,
  quoteResponse:    unknown,
): Promise<ShadowSetupTxs> {
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
  // Use actual SHDW balance received (not the estimate from the quote)
  const ix = buildInitAccount2Ix(
    {
      identifier: `solvik-${userWalletPubkey.slice(0, 8)}`,
      storage: new BN(shdwBalance.toString()),
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

  const blockhash = (await connection.getLatestBlockhash()).blockhash

  const setupTx = new Transaction()
  setupTx.add(ix)
  setupTx.recentBlockhash = blockhash
  setupTx.feePayer = userWallet

  // makeAccountImmutable2 — se firma después de crear la cuenta
  // storageUsed = 0 porque la cuenta recién se crea y no tiene archivos aún
  const emissionsAta = await getAssociatedTokenAddress(SHDW_MINT, SHDW_EMISSIONS_WALLET)
  const immutableIx = buildMakeImmutableIx(
    new BN(0),
    {
      storageConfig:   storageConfigPDA,
      storageAccount,
      stakeAccount,
      emissionsWallet: emissionsAta,
      owner:           userWallet,
      ownerAta:        userShdwAta,
      tokenMint:       SHDW_MINT,
    },
  )

  const immutableTx = new Transaction()
  immutableTx.add(immutableIx)
  immutableTx.recentBlockhash = blockhash
  immutableTx.feePayer = userWallet

  return {
    shadowSetupTx:   setupTx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
    makeImmutableTx: immutableTx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64'),
  }
}
