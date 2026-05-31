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

    // First-time setup: no tree exists yet
    if (!hasTree) {
      if (!(await feePoolHasTriggerAmount())) {
        return NextResponse.json({ ok: true, status: 'waiting_for_deposit' })
      }
      const address = await provisionMerkleTree()
      return NextResponse.json({ ok: true, status: 'provisioned', merkle_tree_address: address })
    }

    // Ongoing: provision next tree when current one is 85% full and $10 are ready
    const [nearlyFull, hasfunds] = await Promise.all([
      isCurrentTreeNearlyFull(),
      feePoolHasTriggerAmount(),
    ])

    if (!nearlyFull) {
      return NextResponse.json({ ok: true, status: 'tree_has_capacity' })
    }
    if (!hasfunds) {
      return NextResponse.json({ ok: true, status: 'waiting_for_deposit' })
    }

    const address = await provisionMerkleTree()
    return NextResponse.json({ ok: true, status: 'new_tree_provisioned', merkle_tree_address: address })
  } catch (err) {
    console.error('Merkle tree provision error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
