import { NextRequest, NextResponse } from 'next/server'
import { Keypair } from '@solana/web3.js'
import { verifyChallenge } from '@/lib/altcha'

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

const PLAN_AMOUNTS: Record<string, number> = {
  verk:   9.50,
  varde: 39.45,
  kraft: 99.25,
  dev:    5.00,
}

export async function GET(req: NextRequest) {
  const altchaPayload = req.headers.get('x-altcha-payload')
  if (altchaPayload) {
    const valid = await verifyChallenge(altchaPayload)
    if (!valid) {
      return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 })
    }
  }

  const { searchParams } = new URL(req.url)
  const plan         = searchParams.get('plan')
  const product      = searchParams.get('product')
  const amount_param = searchParams.get('amount')

  let amount: number
  let memo: string

  if (plan && PLAN_AMOUNTS[plan] !== undefined) {
    amount = PLAN_AMOUNTS[plan]
    memo   = `plan-${plan}`
  } else if (product && amount_param) {
    amount = Number(amount_param) / 1_000_000
    memo   = `product-${product}`
  } else {
    return NextResponse.json({ error: 'Parámetro inválido' }, { status: 400 })
  }

  const owner = process.env.OWNER_WALLET ?? process.env.NEXT_PUBLIC_OWNER_WALLET
  if (!owner) return NextResponse.json({ error: 'OWNER_WALLET no configurada' }, { status: 500 })

  const reference = Keypair.generate().publicKey.toBase58()
  const isDevnet   = process.env.DEVNET_MODE === 'true'

  // En devnet: SOL nativo (0.001 SOL), sin spl-token — USDC no existe en devnet.
  // En mainnet: USDC real con el monto del plan.
  const url = isDevnet
    ? `solana:${owner}` +
      `?amount=0.001` +
      `&reference=${reference}` +
      `&label=${encodeURIComponent('Solvik Studio [DEVNET]')}` +
      `&memo=${encodeURIComponent('devnet-' + memo)}` +
      `&message=${encodeURIComponent('Prueba devnet — no mames, es dinero falso')}`
    : `solana:${owner}` +
      `?amount=${amount}` +
      `&spl-token=${USDC_MINT}` +
      `&reference=${reference}` +
      `&label=${encodeURIComponent('Solvik Studio')}` +
      `&memo=${encodeURIComponent(memo)}` +
      `&message=${encodeURIComponent('Pago Solvik Studio')}`

  return NextResponse.json({ url, reference, devnet: isDevnet })
}
