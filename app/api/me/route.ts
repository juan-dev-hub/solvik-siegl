import { NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ issuer: null }, { status: 401 })

  const { data: issuer } = await supabaseAdmin
    .from('issuers')
    .select('wallet_address, institution_name, slug, plan, credits')
    .eq('wallet_address', wallet)
    .single()

  return NextResponse.json({ issuer })
}
