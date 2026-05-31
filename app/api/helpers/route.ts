// API de wallets colaboradoras (ACL) — solo planes VARDE y Studio.
// Cada issuer puede autorizar hasta 3 wallets adicionales para emitir
// certificados bajo su identidad. El certificado siempre queda firmado
// por el issuer dueño de la cuenta — el helper solo opera en su nombre.
//
// La lista se guarda en la columna helper_wallets TEXT[] de issuers.
// Ver: supabase-migration-v4.sql

import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { PublicKey } from '@solana/web3.js'

const MAX_HELPERS = 3
// Solo estos planes tienen acceso al feature de helpers
const PLANS_WITH_HELPERS = ['varde', 'studio']

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

  return NextResponse.json({ helpers: data.helper_wallets ?? [] })
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

  if (current.length >= MAX_HELPERS) {
    return NextResponse.json({ error: `Límite de ${MAX_HELPERS} colaboradores alcanzado.` }, { status: 400 })
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
