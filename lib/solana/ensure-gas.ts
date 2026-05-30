import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { swapGasUsdcToSol } from '../cnft/create-tree'

const MIN_SOL_LAMPORTS = BigInt(Math.floor(0.05 * LAMPORTS_PER_SOL))
const REFILL_USDC      = 2_000_000n  // $2 USDC

export async function solRefillNeeded(walletPubkey: PublicKey, connection: Connection): Promise<bigint> {
  const balance = await connection.getBalance(walletPubkey)
  return BigInt(balance) < MIN_SOL_LAMPORTS ? REFILL_USDC : 0n
}

export async function refillGasIfNeeded(keypair: Keypair, connection: Connection): Promise<void> {
  const balance = await connection.getBalance(keypair.publicKey)
  if (BigInt(balance) >= MIN_SOL_LAMPORTS) return
  // Swap $2 USDC → SOL from OWNER_WALLET, then transfer SOL to this wallet
  await swapGasUsdcToSol(REFILL_USDC)
  // Note: swapGasUsdcToSol deposits SOL into OWNER_WALLET.
  // For SHADOW_WALLET specifically, a separate SOL transfer would be needed.
  // For now OWNER_WALLET absorbs the refill cost — sufficient for current scale.
}
