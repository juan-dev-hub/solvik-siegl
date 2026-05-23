import { NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getUSDCBalance } from '@/lib/solana-pay'
import { Connection } from '@solana/web3.js'

export async function GET() {
  try {
    const wallet = await getWalletSession()
    if (!wallet || wallet !== process.env.ADMIN_WALLET) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('usdc_amount, created_at, owner_amount, fee_pool_amount, contract_amount')

    const totalUSDC = (payments ?? []).reduce((s, p) => s + p.usdc_amount, 0) / 1_000_000

    const now = new Date()
    const monthlyData: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyData[key] = 0
    }
    for (const p of payments ?? []) {
      const d = new Date(p.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key in monthlyData) monthlyData[key] += p.usdc_amount / 1_000_000
    }

    // This month
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthUSDC = monthlyData[thisMonthKey] ?? 0

    const { count: activeIssuers } = await supabaseAdmin
      .from('issuers').select('*', { count: 'exact', head: true }).neq('plan', 'free')

    const { count: totalCerts } = await supabaseAdmin
      .from('certificates').select('*', { count: 'exact', head: true })

    const { data: issuers } = await supabaseAdmin
      .from('issuers').select('*').order('registered_at', { ascending: false })

    const issuerStats = await Promise.all(
      (issuers ?? []).map(async iss => {
        const { count } = await supabaseAdmin
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('issuer_wallet', iss.wallet_address)
        return { ...iss, cert_count: count ?? 0 }
      })
    )

    const contractBalance = await getUSDCBalance(process.env.CONTRACT_WALLET!)

    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')
    let feePoolBalanceSOL = 0
    try {
      const { Keypair } = await import('@solana/web3.js')
      const secret = JSON.parse(process.env.FEE_POOL_WALLET_SECRET!) as number[]
      const kp = Keypair.fromSecretKey(Uint8Array.from(secret))
      feePoolBalanceSOL = (await connection.getBalance(kp.publicKey)) / 1e9
    } catch {}

    const { data: config } = await supabaseAdmin.from('system_config').select('key, value')
    const contractActive = config?.find(c => c.key === 'contract_active')?.value === 'true'

    return NextResponse.json({
      total_usdc: totalUSDC,
      month_usdc: monthUSDC,
      monthly_usdc: monthlyData,
      active_issuers: activeIssuers ?? 0,
      total_certificates: totalCerts ?? 0,
      fee_pool_balance_sol: feePoolBalanceSOL,
      contract_wallet_balance_usdc: contractBalance,
      ready_to_activate: contractBalance >= 25,
      contract_active: contractActive,
      issuers: issuerStats,
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
