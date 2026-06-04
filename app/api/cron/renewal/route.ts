import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAndRenewStorage } from '@/lib/payments/renewal'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: issuers } = await supabaseAdmin
    .from('issuers')
    .select('wallet_address')
    .not('storage_expires_at', 'is', null)
    .gt('renewal_reserve_usdc', 0)

  if (!issuers?.length) return NextResponse.json({ ok: true, renewed: 0 })

  const results = await Promise.allSettled(
    issuers.map(i => checkAndRenewStorage(i.wallet_address))
  )
  const renewed = results.filter(r => r.status === 'fulfilled' && r.value.renewed).length
  return NextResponse.json({ ok: true, renewed, total: issuers.length })
}
