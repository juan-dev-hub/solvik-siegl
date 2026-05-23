import { NextRequest, NextResponse } from 'next/server'
import { verifyWalletSignature, createWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { wallet_address, message, signature } = (await req.json()) as {
      wallet_address: string
      message: string
      signature: number[]
    }

    if (!wallet_address || !message || !signature) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const valid = verifyWalletSignature(message, signature, wallet_address)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Create slug from timestamp if new issuer
    const slug = wallet_address.slice(0, 8).toLowerCase()

    await supabaseAdmin.from('issuers').upsert(
      { wallet_address, institution_name: 'Sin nombre', plan: 'free', credits: 0, slug },
      { onConflict: 'wallet_address', ignoreDuplicates: true }
    )

    await createWalletSession(wallet_address)
    return NextResponse.json({ ok: true, wallet: wallet_address })
  } catch (err) {
    console.error('Auth error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
