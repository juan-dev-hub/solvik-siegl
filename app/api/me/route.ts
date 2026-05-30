import { NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ issuer: null }, { status: 401 })

  const { data: issuer } = await supabaseAdmin
    .from('issuers')
    .select('wallet_address, institution_name, slug, storage_used_bytes, storage_limit_bytes, page_active, page_headline, page_tagline, page_about, page_cta, plan, plan_expires_at, auto_renew')
    .eq('wallet_address', wallet)
    .single()

  // Normalize: if plan column missing but storage > 0, treat as legacy active user
  if (issuer && !issuer.plan && issuer.storage_limit_bytes > 0) {
    issuer.plan = 'starter'
  }

  return NextResponse.json({ issuer })
}
