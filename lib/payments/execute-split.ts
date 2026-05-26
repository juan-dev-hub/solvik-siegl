import { Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
} from '@solana/spl-token'
import { getConnection } from '../solana/connection'

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const USDC_DECIMALS = 6

export async function executeUSDCSplit(
  transfers: Array<{ recipient: string; amount: bigint }>
): Promise<string> {
  const secret = JSON.parse(process.env.OWNER_WALLET_SECRET!) as number[]
  const ownerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))
  const connection = getConnection()
  const ownerAta = await getAssociatedTokenAddress(USDC_MINT, ownerKeypair.publicKey)

  const tx = new Transaction()
  for (const { recipient, amount } of transfers) {
    if (amount === 0n) continue
    const recipientAta = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(recipient))
    tx.add(
      createTransferCheckedInstruction(
        ownerAta,
        USDC_MINT,
        recipientAta,
        ownerKeypair.publicKey,
        amount,
        USDC_DECIMALS
      )
    )
  }

  return sendAndConfirmTransaction(connection, tx, [ownerKeypair])
}
