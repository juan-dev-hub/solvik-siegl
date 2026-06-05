import { NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import {
  feePoolHasTriggerAmount,
  merkleTreeProvisioned,
  isCurrentTreeNearlyFull,
  provisionMerkleTree,
} from '@/lib/cnft/provision'

export async function POST() {
  const wallet = await getWalletSession()
  if (!wallet || wallet !== process.env.ADMIN_WALLET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hasTree   = await merkleTreeProvisioned()
  const isFirst   = !hasTree
  const nearlyFull = hasTree ? await isCurrentTreeNearlyFull() : false

  if (hasTree && !nearlyFull) {
    return NextResponse.json({ error: 'El árbol actual todavía tiene capacidad disponible.' }, { status: 400 })
  }

  const hasFunds = await feePoolHasTriggerAmount(isFirst)
  if (!hasFunds) {
    const needed = isFirst ? 6 : 11
    return NextResponse.json({ error: `FeePool insuficiente. Necesita al menos $${needed} USDC.` }, { status: 400 })
  }

  try {
    const address = await provisionMerkleTree(isFirst)
    return NextResponse.json({ ok: true, tree_address: address, was_first: isFirst })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al provisionar árbol.' }, { status: 500 })
  }
}
