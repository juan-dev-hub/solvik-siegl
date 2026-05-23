import { getWalletSession } from '@/lib/wallet-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { DashboardHome } from '@/components/DashboardHome'

export default async function DashboardPage() {
  const wallet = await getWalletSession()
  if (!wallet) redirect('/')

  const { data: issuer } = await supabaseAdmin
    .from('issuers').select('*').eq('wallet_address', wallet).single()

  const { count: totalCerts } = await supabaseAdmin
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('issuer_wallet', wallet)

  const { data: recentCerts } = await supabaseAdmin
    .from('certificates')
    .select('id, arweave_tx_id, issued_to, doc_type, issued_at')
    .eq('issuer_wallet', wallet)
    .order('issued_at', { ascending: false })
    .limit(5)

  // Verification count this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: monthVerifications } = await supabaseAdmin
    .from('certificate_verifications')
    .select('certificates!inner(issuer_wallet)', { count: 'exact', head: true })
    .eq('certificates.issuer_wallet', wallet)
    .gte('verified_at', startOfMonth.toISOString())

  const updateNameSlot =
    issuer?.institution_name === 'Sin nombre' ? (
      <UpdateNameForm wallet={wallet} />
    ) : null

  return (
    <DashboardHome
      wallet={wallet}
      issuer={issuer ?? null}
      totalCerts={totalCerts ?? 0}
      recentCerts={recentCerts ?? []}
      monthVerifications={monthVerifications ?? 0}
      updateNameSlot={updateNameSlot}
    />
  )
}

function UpdateNameForm({ wallet }: { wallet: string }) {
  return (
    <form
      action={async (fd: FormData) => {
        'use server'
        const name = fd.get('name') as string
        if (!name?.trim()) return
        const { supabaseAdmin: db } = await import('@/lib/supabase')
        await db.from('issuers').update({ institution_name: name.trim() }).eq('wallet_address', wallet)
        const { redirect: r } = await import('next/navigation')
        r('/dashboard')
      }}
      style={{ marginTop: 12, display: 'flex', gap: 12 }}
    >
      <input name="name" placeholder="Institution name" style={{ marginBottom: 0, flex: 1 }} />
      <button type="submit" className="btn-primary" style={{ flexShrink: 0 }}>Save</button>
    </form>
  )
}
