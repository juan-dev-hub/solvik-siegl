import { NextRequest, NextResponse } from 'next/server'
import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const wallet = await getWalletSession()
    if (!wallet || wallet !== process.env.ADMIN_WALLET) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { program_id, confirm } = (await req.json()) as { program_id: string; confirm: boolean }
    if (!confirm || !program_id) {
      return NextResponse.json({ error: 'Missing confirmation or program_id' }, { status: 400 })
    }

    await supabaseAdmin
      .from('system_config')
      .upsert({ key: 'contract_active', value: 'true' }, { onConflict: 'key' })

    await supabaseAdmin
      .from('system_config')
      .upsert({ key: 'program_id', value: program_id }, { onConflict: 'key' })

    return NextResponse.json({ ok: true, program_id })
  } catch (err) {
    console.error('Activate contract error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
