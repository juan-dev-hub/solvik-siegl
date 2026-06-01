import { NextRequest, NextResponse } from 'next/server'
import {
  merkleTreeProvisioned,
  isCurrentTreeNearlyFull,
  feePoolHasTriggerAmount,
  provisionMerkleTree,
} from '@/lib/cnft/provision'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const hasTree = await merkleTreeProvisioned()

    // Primer árbol: requiere $6 en FEE_POOL ($5 árbol + $1 fee swap)
    if (!hasTree) {
      if (!(await feePoolHasTriggerAmount(true))) {
        return NextResponse.json({ ok: true, status: 'waiting_for_deposit', needed_usdc: 6 })
      }
      const address = await provisionMerkleTree(true)
      return NextResponse.json({ ok: true, status: 'provisioned', merkle_tree_address: address })
    }

    // Árbol subsiguiente: requiere $11 en FEE_POOL ($10 árbol + $1 fee swap)
    const [nearlyFull, hasfunds] = await Promise.all([
      isCurrentTreeNearlyFull(),
      feePoolHasTriggerAmount(false),
    ])

    if (!nearlyFull) {
      return NextResponse.json({ ok: true, status: 'tree_has_capacity' })
    }
    if (!hasfunds) {
      return NextResponse.json({ ok: true, status: 'waiting_for_deposit', needed_usdc: 11 })
    }

    const address = await provisionMerkleTree(false)
    return NextResponse.json({ ok: true, status: 'new_tree_provisioned', merkle_tree_address: address })
  } catch (err) {
    console.error('Merkle tree provision error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
