import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAndRenewStorage } from '@/lib/payments/renewal'
import {
  feePoolHasTriggerAmount,
  merkleTreeProvisioned,
  isCurrentTreeNearlyFull,
  provisionMerkleTree,
} from '@/lib/cnft/provision'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 1. Storage renewals ──────────────────────────────────────────────────────
  const { data: issuers } = await supabaseAdmin
    .from('issuers')
    .select('wallet_address')
    .not('storage_expires_at', 'is', null)
    .gt('renewal_reserve_usdc', 0)

  let renewed = 0
  if (issuers?.length) {
    const results = await Promise.allSettled(
      issuers.map(i => checkAndRenewStorage(i.wallet_address))
    )
    renewed = results.filter(r => r.status === 'fulfilled' && r.value.renewed).length
  }

  // ── 2. Merkle tree auto-provisioning ─────────────────────────────────────────
  let merkleProvisioned: string | null = null
  let merkleSkipped: string | null = null

  try {
    const hasTree    = await merkleTreeProvisioned()
    const isFirst    = !hasTree
    const nearlyFull = hasTree ? await isCurrentTreeNearlyFull() : false

    if (isFirst || nearlyFull) {
      const hasFunds = await feePoolHasTriggerAmount(isFirst)
      if (hasFunds) {
        const address = await provisionMerkleTree(isFirst)
        merkleProvisioned = address
      } else {
        merkleSkipped = isFirst ? 'insufficient_funds_first_tree' : 'insufficient_funds_next_tree'
      }
    } else {
      merkleSkipped = 'tree_has_capacity'
    }
  } catch (err) {
    console.error('[cron/renewal] Merkle tree error:', err)
    merkleSkipped = 'error'
  }

  return NextResponse.json({
    ok: true,
    renewed,
    total: issuers?.length ?? 0,
    merkle: merkleProvisioned ? { provisioned: merkleProvisioned } : { skipped: merkleSkipped },
  })
}
