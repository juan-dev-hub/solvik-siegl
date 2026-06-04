import { NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const wallet = await getWalletSession()
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: vault } = await supabaseAdmin
    .from('vault_accounts').select('*').eq('wallet_address', wallet).single()

  const { data: files } = vault
    ? await supabaseAdmin.from('vault_files').select('*').eq('owner_wallet', wallet).order('uploaded_at', { ascending: false })
    : { data: [] }

  return NextResponse.json({ vault: vault ?? null, files: files ?? [] })
}
