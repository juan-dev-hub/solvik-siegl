import { Keypair, PublicKey, Transaction } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createApproveCheckedInstruction,
  createTransferCheckedInstruction,
} from '@solana/spl-token'
import { getConnection } from '../solana/connection'
import { PLAN_PRICES_USDC } from './splits'

const USDC_MINT     = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const USDC_DECIMALS = 6
const RENEWAL_MONTHS = 12  // user pre-authorizes 12 months at once

// Build an unsigned tx the user signs once to delegate USDC for auto-renewals.
// Returned as base64 — frontend signs with Phantom after the initial subscription.
export async function buildRenewalDelegateTx(
  userWalletPubkey: string,
  planId: string,
): Promise<string> {
  const planPrice = PLAN_PRICES_USDC[planId]
  if (!planPrice) throw new Error('Invalid plan')

  const connection   = getConnection()
  const ownerPubkey  = new PublicKey(process.env.OWNER_WALLET ?? process.env.NEXT_PUBLIC_OWNER_WALLET!)
  const userWallet   = new PublicKey(userWalletPubkey)
  const userUsdcAta  = await getAssociatedTokenAddress(USDC_MINT, userWallet)
  const delegateAmt  = planPrice * BigInt(RENEWAL_MONTHS)

  const tx = new Transaction()
  tx.add(createApproveCheckedInstruction(
    userUsdcAta,
    USDC_MINT,
    ownerPubkey,   // delegate: backend can pull up to this amount
    userWallet,    // owner
    delegateAmt,
    USDC_DECIMALS,
  ))
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  tx.feePayer = userWallet

  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64')
}

// Called by the daily cron — pulls one month's payment from user's USDC ATA using delegation.
export async function executeRenewal(
  userWalletPubkey: string,
  planId: string,
): Promise<string> {
  const planPrice = PLAN_PRICES_USDC[planId]
  if (!planPrice) throw new Error('Invalid plan')

  const secret       = JSON.parse(process.env.OWNER_WALLET_SECRET!) as number[]
  const ownerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))
  const connection   = getConnection()

  const userWallet = new PublicKey(userWalletPubkey)
  const userAta    = await getAssociatedTokenAddress(USDC_MINT, userWallet)
  const ownerAta   = await getAssociatedTokenAddress(USDC_MINT, ownerKeypair.publicKey)

  const tx = new Transaction()
  // Delegated transfer: ownerKeypair is the approved delegate, signs as authority
  tx.add(createTransferCheckedInstruction(
    userAta,
    USDC_MINT,
    ownerAta,
    ownerKeypair.publicKey,  // delegate authority (not the token account owner)
    planPrice,
    USDC_DECIMALS,
  ))
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  tx.feePayer = ownerKeypair.publicKey
  tx.sign(ownerKeypair)

  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
  await connection.confirmTransaction(sig, 'confirmed')
  return sig
}
