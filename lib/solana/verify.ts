import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import { getConnection } from './connection'

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

export async function verifyUSDCPayment(
  txHash: string,
  expectedRecipient: string,
  expectedAmount: bigint
): Promise<{ valid: boolean; actualAmount: bigint; buyerWallet: string }> {
  const connection = getConnection()

  const expectedAta = await getAssociatedTokenAddress(
    USDC_MINT,
    new PublicKey(expectedRecipient)
  )
  const expectedAtaStr = expectedAta.toBase58()

  const tx = await connection.getParsedTransaction(txHash, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  })

  if (!tx) return { valid: false, actualAmount: 0n, buyerWallet: '' }

  const buyerWallet = tx.transaction.message.accountKeys[0]?.pubkey?.toBase58() ?? ''

  const instructions = tx.transaction.message.instructions
  for (const ix of instructions) {
    if ('parsed' in ix && ix.parsed?.type === 'transferChecked') {
      const info = ix.parsed.info
      if (
        info.mint === USDC_MINT.toBase58() &&
        info.destination === expectedAtaStr &&
        info.tokenAmount?.amount
      ) {
        const amount = BigInt(info.tokenAmount.amount)
        if (amount >= expectedAmount) {
          return { valid: true, actualAmount: amount, buyerWallet }
        }
      }
    }
  }

  return { valid: false, actualAmount: 0n, buyerWallet: '' }
}

export async function getUSDCBalance(walletAddress: string): Promise<number> {
  try {
    const connection = getConnection()
    const ata = await getAssociatedTokenAddress(
      USDC_MINT,
      new PublicKey(walletAddress)
    )
    const account = await getAccount(connection, ata)
    return Number(account.amount) / 1_000_000
  } catch {
    return 0
  }
}
