import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyUSDCPayment, calculateSplit, executeUSDCSplit } from '@/lib/solana-pay'

const PLANS: Record<string, { price_usdc: bigint; credits: number }> = {
  starter: { price_usdc: 9_000_000n,  credits: 15  },
  pro:     { price_usdc: 25_000_000n, credits: 60  },
  studio:  { price_usdc: 59_000_000n, credits: 200 },
}

export async function POST(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan_id, tx_hash } = (await req.json()) as { plan_id: string; tx_hash: string }
    const plan = PLANS[plan_id]
    if (!plan) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const { valid, actualAmount } = await verifyUSDCPayment(
      tx_hash,
      (process.env.OWNER_WALLET ?? process.env.NEXT_PUBLIC_OWNER_WALLET)!,
      plan.price_usdc
    )
    if (!valid) return NextResponse.json({ error: 'Payment not verified' }, { status: 400 })

    // Check if contract is active
    const { data: config } = await supabaseAdmin
      .from('system_config')
      .select('key, value')
    const contractActive = config?.find(c => c.key === 'contract_active')?.value === 'true'

    const split = calculateSplit(actualAmount, contractActive)

    const splitTxHash = await executeUSDCSplit([
      { recipient: process.env.FEE_POOL_WALLET!, amount: split.fee_pool_amount },
      { recipient: process.env.CONTRACT_WALLET!, amount: split.contract_amount },
    ])

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await supabaseAdmin.from('issuers').upsert({
      wallet_address: wallet,
      institution_name: 'Sin nombre',
      plan: plan_id,
      credits: plan.credits,
      plan_renewed_at: new Date().toISOString(),
      plan_expires_at: expiresAt.toISOString(),
    }, { onConflict: 'wallet_address' })

    await supabaseAdmin.from('payments').insert({
      issuer_wallet: wallet,
      type: 'subscription',
      plan_or_pkg_id: plan_id,
      usdc_amount: Number(actualAmount),
      owner_amount: Number(split.owner_amount),
      fee_pool_amount: Number(split.fee_pool_amount),
      contract_amount: Number(split.contract_amount),
      solana_tx_hash: tx_hash,
      split_tx_hash: splitTxHash,
      credits_added: plan.credits,
    })

    return NextResponse.json({ ok: true, credits: plan.credits, plan: plan_id })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
