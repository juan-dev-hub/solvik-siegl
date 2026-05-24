import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  getAccount,
  createTransferCheckedInstruction,
} from '@solana/spl-token'

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const USDC_DECIMALS = 6

export type PaymentSplit = {
  owner_amount: bigint
  fee_pool_amount: bigint
  contract_amount: bigint
}

export type BookPaymentSplit = {
  comision_solvik: bigint
  fee_pool_amount: bigint
  contract_amount: bigint
  issuer_amount: bigint
}

export async function verifyUSDCPayment(
  txHash: string,
  expectedRecipient: string,
  expectedAmount: bigint
): Promise<{ valid: boolean; actualAmount: bigint; buyerWallet: string }> {
  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')

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

// Split for subscriptions and credits (75/15/10).
// When the on-chain contract is active, owner absorbs the 10% contract share (85/15/0).
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

// Split for book purchases (5/15/10/70).
// The 5% Solvik commission is already baked into the book price — not charged on top.
// issuer_amount is derived as remainder to absorb any rounding dust.
export function calculateBookSplit(totalAmount: bigint): BookPaymentSplit {
  const fee_pool_amount = (totalAmount * 15n) / 100n
  const contract_amount = (totalAmount * 10n) / 100n
  const comision_solvik = (totalAmount * 5n) / 100n
  const issuer_amount = totalAmount - fee_pool_amount - contract_amount - comision_solvik
  return { comision_solvik, fee_pool_amount, contract_amount, issuer_amount }
}

// Sends USDC from OWNER_WALLET to each recipient in a single transaction.
// Entries with amount === 0n are skipped.
// Returns the Solana transaction signature of the split.
export async function executeUSDCSplit(
  transfers: Array<{ recipient: string; amount: bigint }>
): Promise<string> {
  const secret = JSON.parse(process.env.OWNER_WALLET_SECRET!) as number[]
  const ownerKeypair = Keypair.fromSecretKey(Uint8Array.from(secret))

  const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')
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
