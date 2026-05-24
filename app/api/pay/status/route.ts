import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const reference = searchParams.get('reference')
  if (!reference) return NextResponse.json({ error: 'Missing reference' }, { status: 400 })

  try {
    const conn = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')
    const referencePubkey = new PublicKey(reference)

    const signatures = await conn.getSignaturesForAddress(referencePubkey, { limit: 5 })
    if (signatures.length === 0) return NextResponse.json({ found: false })

    const confirmed = signatures.find(
      s => s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized'
    )
    if (!confirmed) return NextResponse.json({ found: false })

    return NextResponse.json({ found: true, signature: confirmed.signature })
  } catch {
    return NextResponse.json({ found: false })
  }
}
