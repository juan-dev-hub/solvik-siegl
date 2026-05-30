import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/auth'
import { processSubscription } from '@/lib/payments'

export async function POST(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan_id, tx_hash } = (await req.json()) as { plan_id: string; tx_hash: string }
    if (!plan_id || !tx_hash) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const result = await processSubscription(wallet, plan_id, tx_hash)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      plan: plan_id,
      // Present on first payment — frontend must have user sign this with Phantom
      // then POST to https://shadow-storage.genesysgo.net/storage-account
      shadowSetupTx: result.shadowSetupTx ?? null,
    })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
