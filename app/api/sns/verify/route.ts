import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyWalletOwnsDomain } from '@/lib/sns'

export async function POST(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { domain } = (await req.json()) as { domain: string }
    if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

    const owns = await verifyWalletOwnsDomain(wallet, domain)

    if (owns) {
      await supabaseAdmin
        .from('issuers')
        .update({ sns_domain: domain, sns_verified: true })
        .eq('wallet_address', wallet)
      return NextResponse.json({ verified: true, domain })
    }

    return NextResponse.json({ verified: false, message: 'Domain not owned by this wallet' })
  } catch (err) {
    console.error('SNS verify error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
