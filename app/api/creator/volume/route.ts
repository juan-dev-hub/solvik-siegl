import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')
    const pubkey = new PublicKey(wallet)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 200 })
    const recent = signatures.filter(s => (s.blockTime ?? 0) * 1000 >= thirtyDaysAgo)

    const plan = recent.length >= 50 ? 'sovereign' : 'launch'
    const price = plan === 'sovereign' ? 99 : 29

    return NextResponse.json({ plan, price, tx_count_30d: recent.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
