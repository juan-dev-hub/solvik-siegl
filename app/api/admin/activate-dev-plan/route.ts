import { NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  const wallet = await getWalletSession()
  if (!wallet || wallet !== process.env.ADMIN_WALLET) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const renewalDate = new Date()
  renewalDate.setDate(renewalDate.getDate() + 30)

  const { data: existing } = await supabaseAdmin
    .from('issuers').select('wallet_address').eq('wallet_address', wallet).single()

  if (!existing) {
    await supabaseAdmin.from('issuers').insert({
      wallet_address:        wallet,
      institution_name:      'Admin',
      slug:                  wallet.slice(0, 8).toLowerCase(),
      storage_limit_bytes:   500 * 1024 * 1024, // 500 MB
      plan:                  'dev',
      plan_expires_at:       renewalDate.toISOString(),
      auto_renew:            false,
      shadow_account_pubkey: 'DEV_' + wallet.slice(0, 8),
    })
  } else {
    await supabaseAdmin.from('issuers')
      .update({
        plan:            'dev',
        plan_expires_at: renewalDate.toISOString(),
        auto_renew:      false,
      })
      .eq('wallet_address', wallet)
  }

  return NextResponse.json({ ok: true, expires_at: renewalDate.toISOString() })
}
