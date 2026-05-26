import { NextRequest, NextResponse } from 'next/server'
import { verifyWalletSignature, createWalletSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyChallenge } from '@/lib/altcha'

export async function POST(req: NextRequest) {
  try {
    const altchaPayload = req.headers.get('x-altcha-payload')
    if (!altchaPayload) {
      return NextResponse.json({ error: 'Verificación requerida' }, { status: 400 })
    }
    const altchaValid = await verifyChallenge(altchaPayload)
    if (!altchaValid) {
      return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 })
    }

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

    const slug = wallet_address.slice(0, 8).toLowerCase()

    await supabaseAdmin.from('issuers').upsert(
      { wallet_address, institution_name: 'Sin nombre', slug },
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
