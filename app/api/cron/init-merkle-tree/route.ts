import { NextRequest, NextResponse } from 'next/server'
import {
  merkleTreeProvisioned,
  feePoolHasTriggerAmount,
  provisionMerkleTree,
} from '@/lib/cnft/provision'

export async function GET(req: NextRequest) {
  // Vercel cron sends this header — block external calls
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Skip if already provisioned
    if (await merkleTreeProvisioned()) {
      return NextResponse.json({ ok: true, status: 'already_provisioned' })
    }

    // Wait for the $5 USDC deposit trigger
    if (!(await feePoolHasTriggerAmount())) {
      return NextResponse.json({ ok: true, status: 'waiting_for_deposit' })
    }

    // Conditions met: swap OWNER_WALLET USDC → SOL → create tree
    const address = await provisionMerkleTree()
    return NextResponse.json({ ok: true, status: 'provisioned', merkle_tree_address: address })
  } catch (err) {
    console.error('Merkle tree provision error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
