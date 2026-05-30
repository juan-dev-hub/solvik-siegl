import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { executeRenewal } from '@/lib/payments/subscription'
import { processSubscription } from '@/lib/payments'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date()
  today.setHours(23, 59, 59, 999)

  const { data: due } = await supabaseAdmin
    .from('issuers')
    .select('wallet_address, plan')
    .eq('auto_renew', true)
    .lte('plan_expires_at', today.toISOString())

  if (!due?.length) return NextResponse.json({ ok: true, renewed: 0 })

  const results = await Promise.allSettled(
    due.map(async issuer => {
      try {
        // Pull payment via delegation
        const sig = await executeRenewal(issuer.wallet_address, issuer.plan)
        // Process splits for renewal
        await processSubscription(issuer.wallet_address, issuer.plan, sig)
        return { wallet: issuer.wallet_address, status: 'renewed' }
      } catch (e) {
        // Delegation expired or insufficient balance — mark auto_renew off
        await supabaseAdmin
          .from('issuers')
          .update({ auto_renew: false })
          .eq('wallet_address', issuer.wallet_address)
        return { wallet: issuer.wallet_address, status: 'failed', error: String(e) }
      }
    })
  )

  const renewed = results.filter(r => r.status === 'fulfilled').length
  return NextResponse.json({ ok: true, renewed, total: due.length })
}
