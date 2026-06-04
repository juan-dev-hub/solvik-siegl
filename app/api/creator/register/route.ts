import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug, display_name, bio } =
    (await req.json()) as { slug: string; display_name: string; bio?: string }

  if (!slug || slug.length < 2) return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })
  if (!display_name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const { data: existing } = await supabaseAdmin
    .from('creators').select('wallet_address').eq('slug', slug).single()
  if (existing) return NextResponse.json({ error: 'Ese slug ya está en uso' }, { status: 409 })

  const { data, error } = await supabaseAdmin
    .from('creators')
    .upsert({ wallet_address: wallet, display_name, slug, bio: bio ?? null }, { onConflict: 'wallet_address' })
    .select().single()

  if (error) throw error
  return NextResponse.json({ ok: true, creator: data })
}
