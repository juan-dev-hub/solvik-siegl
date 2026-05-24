import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyUSDCPayment, calculateSplit, executeUSDCSplit } from '@/lib/solana-pay'

const PACKAGES: Record<string, { price_usdc: bigint; credits: number }> = {
  mini:   { price_usdc: 5_000_000n,  credits: 10  },
  normal: { price_usdc: 18_000_000n, credits: 50  },
  grande: { price_usdc: 55_000_000n, credits: 200 },
}

export async function POST(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { package_id, tx_hash } = (await req.json()) as { package_id: string; tx_hash: string }
    const pkg = PACKAGES[package_id]
    if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 })

    const { data: issuer } = await supabaseAdmin
      .from('issuers').select('plan').eq('wallet_address', wallet).single()
    if (!issuer || issuer.plan === 'free') {
      return NextResponse.json({ error: 'Active plan required to purchase credits' }, { status: 403 })
    }

    const { valid, actualAmount } = await verifyUSDCPayment(
      tx_hash,
      (process.env.OWNER_WALLET ?? process.env.NEXT_PUBLIC_OWNER_WALLET)!,
      pkg.price_usdc
    )
    if (!valid) return NextResponse.json({ error: 'Payment not verified' }, { status: 400 })

    const { data: config } = await supabaseAdmin.from('system_config').select('key, value')
    const contractActive = config?.find(c => c.key === 'contract_active')?.value === 'true'
    const split = calculateSplit(actualAmount, contractActive)

    const splitTxHash = await executeUSDCSplit([
      { recipient: process.env.FEE_POOL_WALLET!, amount: split.fee_pool_amount },
      { recipient: process.env.CONTRACT_WALLET!, amount: split.contract_amount },
    ])

    await supabaseAdmin.rpc('increment_credits', {
      p_wallet: wallet,
      p_amount: pkg.credits,
    })

    await supabaseAdmin.from('payments').insert({
      issuer_wallet: wallet,
      type: 'credits',
      plan_or_pkg_id: package_id,
      usdc_amount: Number(actualAmount),
      owner_amount: Number(split.owner_amount),
      fee_pool_amount: Number(split.fee_pool_amount),
      contract_amount: Number(split.contract_amount),
      solana_tx_hash: tx_hash,
      split_tx_hash: splitTxHash,
      credits_added: pkg.credits,
    })

    return NextResponse.json({ ok: true, credits_added: pkg.credits })
  } catch (err) {
    console.error('Credits purchase error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
