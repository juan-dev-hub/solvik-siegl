import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey } from '@solana/web3.js'

export async function GET(_req: NextRequest, { params }: { params: { wallet: string } }) {
  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC!, 'confirmed')
    const pubkey = new PublicKey(params.wallet)

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    })

    const nfts = tokenAccounts.value
      .filter(a => {
        const info = a.account.data.parsed?.info
        return info?.tokenAmount?.decimals === 0 && info?.tokenAmount?.uiAmount === 1
      })
      .map(a => ({
        mint: a.account.data.parsed?.info?.mint,
        owner: params.wallet,
      }))

    return NextResponse.json({ nfts, total: nfts.length })
  } catch (err) {
    console.error('Gallery error:', err)
    return NextResponse.json({ nfts: [], total: 0 })
  }
}
