// API de wallets colaboradoras (ACL) — VARDE (hasta 3) y KRAFT (hasta 15).
// El certificado siempre queda firmado por el issuer dueño de la cuenta.
// La lista se guarda en la columna helper_wallets TEXT[] de issuers.

import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { PublicKey } from '@solana/web3.js'

const PLAN_MAX_HELPERS: Record<string, number> = {
  varde: 3,
  kraft: 15,
}
const PLANS_WITH_HELPERS = ['varde', 'kraft']

// ── GET /api/helpers — lista de helpers del issuer autenticado ─────────────
export async function GET() {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('issuers')
    .select('helper_wallets, plan')
    .eq('wallet_address', wallet)
    .single()

  if (!data) return NextResponse.json({ error: 'Issuer no encontrado.' }, { status: 404 })
  if (!PLANS_WITH_HELPERS.includes(data.plan)) {
    return NextResponse.json({ error: 'Tu plan no incluye wallets colaboradoras.' }, { status: 403 })
  }

  return NextResponse.json({
    helpers: data.helper_wallets ?? [],
    max_helpers: PLAN_MAX_HELPERS[data.plan] ?? 3,
  })
}

// ── POST /api/helpers — agregar una helper wallet ──────────────────────────
export async function POST(req: NextRequest) {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { helper_wallet } = (await req.json()) as { helper_wallet: string }

  // Validar que sea una pubkey Solana válida
  try { new PublicKey(helper_wallet) } catch {
    return NextResponse.json({ error: 'Dirección de wallet inválida.' }, { status: 400 })
  }

  // Un issuer no puede agregarse a sí mismo
  if (helper_wallet === wallet) {
    return NextResponse.json({ error: 'No podés agregarte a ti mismo como colaborador.' }, { status: 400 })
  }

  const { data: issuer } = await supabaseAdmin
    .from('issuers')
    .select('helper_wallets, plan')
    .eq('wallet_address', wallet)
    .single()

  if (!issuer) return NextResponse.json({ error: 'Issuer no encontrado.' }, { status: 404 })
  if (!PLANS_WITH_HELPERS.includes(issuer.plan)) {
    return NextResponse.json({ error: 'Tu plan no incluye wallets colaboradoras.' }, { status: 403 })
  }

  const current: string[] = issuer.helper_wallets ?? []
  const maxHelpers = PLAN_MAX_HELPERS[issuer.plan] ?? 3

  if (current.length >= maxHelpers) {
    return NextResponse.json({ error: `Límite de ${maxHelpers} colaboradores alcanzado.` }, { status: 400 })
  }
  if (current.includes(helper_wallet)) {
    return NextResponse.json({ error: 'Esa wallet ya es colaboradora.' }, { status: 400 })
  }

  const updated = [...current, helper_wallet]
  await supabaseAdmin
    .from('issuers')
    .update({ helper_wallets: updated })
    .eq('wallet_address', wallet)

  return NextResponse.json({ ok: true, helpers: updated })
}

// ── DELETE /api/helpers — eliminar una helper wallet ──────────────────────
export async function DELETE(req: NextRequest) {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { helper_wallet } = (await req.json()) as { helper_wallet: string }

  const { data: issuer } = await supabaseAdmin
    .from('issuers')
    .select('helper_wallets')
    .eq('wallet_address', wallet)
    .single()

  if (!issuer) return NextResponse.json({ error: 'Issuer no encontrado.' }, { status: 404 })

  const updated = (issuer.helper_wallets ?? []).filter((h: string) => h !== helper_wallet)
  await supabaseAdmin
    .from('issuers')
    .update({ helper_wallets: updated })
    .eq('wallet_address', wallet)

  return NextResponse.json({ ok: true, helpers: updated })
}
