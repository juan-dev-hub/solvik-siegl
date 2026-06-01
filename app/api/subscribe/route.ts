import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/auth'
import { processSubscription } from '@/lib/payments'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan_id, tx_hash } = (await req.json()) as { plan_id: string; tx_hash: string }
    if (!plan_id || !tx_hash) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Modo devnet: saltar toda la lógica on-chain (Shadow Drive, Jupiter, etc.)
    // Solo crear/actualizar el issuer en la DB y retornar success.
    if (process.env.DEVNET_MODE === 'true') {
      const renewalDate = new Date()
      renewalDate.setDate(renewalDate.getDate() + 30)

      const { data: existing } = await supabaseAdmin
        .from('issuers').select('wallet_address').eq('wallet_address', wallet).single()

      if (!existing) {
        await supabaseAdmin.from('issuers').insert({
          wallet_address:        wallet,
          institution_name:      'Sin nombre',
          slug:                  wallet.slice(0, 8).toLowerCase(),
          storage_limit_bytes:   100 * 1024 * 1024,
          plan:                  plan_id,
          plan_expires_at:       renewalDate.toISOString(),
          auto_renew:            false,
          shadow_account_pubkey: 'DEVNET_' + wallet.slice(0, 8),
        })
      } else {
        await supabaseAdmin.from('issuers')
          .update({ plan: plan_id, plan_expires_at: renewalDate.toISOString() })
          .eq('wallet_address', wallet)
      }

      return NextResponse.json({ ok: true, plan: plan_id, devnet: true })
    }

    const result = await processSubscription(wallet, plan_id, tx_hash)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      plan: plan_id,
      renewalDelegateTx: result.renewalDelegateTx ?? null,
    })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
