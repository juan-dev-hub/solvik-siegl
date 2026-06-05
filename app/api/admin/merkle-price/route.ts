import { NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { getConnection } from '@/lib/solana/connection'
import { getCurrentTreeAddress } from '@/lib/cnft/provision'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress } from '@solana/spl-token'

const USDC_MINT  = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const WSOL_MINT  = 'So11111111111111111111111111111111111111112'

export async function GET() {
  const wallet = await getWalletSession()
  if (!wallet || wallet !== process.env.ADMIN_WALLET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connection = getConnection()
  const feePoolPubkey = new PublicKey(process.env.FEE_POOL_WALLET!)

  let usdcBalance = 0
  let solBalance  = 0

  try {
    const ata = await getAssociatedTokenAddress(USDC_MINT, feePoolPubkey)
    const bal = await connection.getTokenAccountBalance(ata)
    usdcBalance = Number(bal.value.amount) / 1_000_000
  } catch { /* no USDC account yet */ }

  try {
    const lamports = await connection.getBalance(feePoolPubkey)
    solBalance = lamports / 1e9
  } catch { /* ignore */ }

  let solPrice = 150
  try {
    const res = await fetch(
      `https://api.jup.ag/price/v2?ids=${WSOL_MINT}&vsToken=${USDC_MINT.toBase58()}`,
      { next: { revalidate: 60 } }
    )
    if (res.ok) {
      const data = await res.json() as { data?: Record<string, { price?: string }> }
      const raw = data.data?.[WSOL_MINT]?.price
      if (raw) solPrice = parseFloat(raw)
    }
  } catch { /* use fallback */ }

  const treeAddress = await getCurrentTreeAddress()

  return NextResponse.json({
    fee_pool_usdc:          usdcBalance,
    fee_pool_sol:           solBalance,
    sol_price_usdc:         solPrice,
    first_tree_trigger:     6,
    first_tree_cost:        5,
    next_tree_trigger:      11,
    next_tree_cost:         10,
    can_create_first_tree:  usdcBalance >= 6,
    can_create_next_tree:   usdcBalance >= 11,
    tree_address:           treeAddress,
    has_tree:               !!treeAddress,
  })
}
