import { Connection, PublicKey } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  getAccount,
} from '@solana/spl-token'

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

export type PaymentSplit = {
  owner_amount: bigint
  fee_pool_amount: bigint
  contract_amount: bigint
}

export async function verifyUSDCPayment(
  txHash: string,
  expectedRecipient: string,
  expectedAmount: bigint
): Promise<{ valid: boolean; actualAmount: bigint }> {
  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')

  // Derive the expected ATA so we can match the exact destination account
  const expectedAta = await getAssociatedTokenAddress(
    USDC_MINT,
    new PublicKey(expectedRecipient)
  )
  const expectedAtaStr = expectedAta.toBase58()

  const tx = await connection.getParsedTransaction(txHash, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  })

  if (!tx) return { valid: false, actualAmount: 0n }

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
          return { valid: true, actualAmount: amount }
        }
      }
    }
  }

  return { valid: false, actualAmount: 0n }
}

export function calculateSplit(
  totalAmount: bigint,
  contractActive: boolean
): PaymentSplit {
  if (contractActive) {
    return {
      owner_amount: (totalAmount * 85n) / 100n,
      fee_pool_amount: (totalAmount * 15n) / 100n,
      contract_amount: 0n,
    }
  }
  return {
    owner_amount: (totalAmount * 75n) / 100n,
    fee_pool_amount: (totalAmount * 15n) / 100n,
    contract_amount: (totalAmount * 10n) / 100n,
  }
}

export async function getUSDCBalance(walletAddress: string): Promise<number> {
  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')
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
