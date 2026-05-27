import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$|^[a-z0-9]{3}$/

export async function PATCH(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { slug, page_active, page_headline, page_tagline, page_about, page_cta } =
      (await req.json()) as {
        slug: string
        page_active: boolean
        page_headline: string
        page_tagline: string
        page_about: string
        page_cta: string
      }

    if (!slug || !SLUG_RE.test(slug)) {
      return NextResponse.json(
        { error: 'Slug inválido. Solo letras minúsculas, números y guiones (mín. 3 caracteres).' },
        { status: 400 },
      )
    }

    // Uniqueness check — slug must not be taken by another issuer
    const { data: existing } = await supabaseAdmin
      .from('issuers')
      .select('wallet_address')
      .eq('slug', slug)
      .neq('wallet_address', wallet)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Ese slug ya está en uso. Elige otro.' },
        { status: 409 },
      )
    }

    const { error } = await supabaseAdmin
      .from('issuers')
      .update({ slug, page_active, page_headline, page_tagline, page_about, page_cta })
      .eq('wallet_address', wallet)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
