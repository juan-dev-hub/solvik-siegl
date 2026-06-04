import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { creator_wallet, usdc_per_month, tx_hash } =
    (await req.json()) as { creator_wallet: string; usdc_per_month: number; tx_hash: string }

  if (!creator_wallet || !usdc_per_month || !tx_hash) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  const { data: sub, error } = await supabaseAdmin
    .from('creator_subscriptions')
    .insert({
      creator_wallet,
      subscriber_wallet: wallet,
      usdc_per_month,
      expires_at: expiresAt.toISOString(),
      solana_tx_hash: tx_hash,
    })
    .select()
    .single()

  if (error) throw error

  await supabaseAdmin
    .from('creators')
    .update({ subscribers_count: supabaseAdmin.rpc('increment', { row_id: creator_wallet }) })
    .eq('wallet_address', creator_wallet)

  return NextResponse.json({ ok: true, subscription: sub })
}
