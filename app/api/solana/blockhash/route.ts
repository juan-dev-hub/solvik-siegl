import { NextResponse } from 'next/server'
import { Connection } from '@solana/web3.js'

export async function GET() {
  try {
    const conn = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash()
    return NextResponse.json({ blockhash, lastValidBlockHeight })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
