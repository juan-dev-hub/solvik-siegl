import { getWalletSession } from '@/lib/wallet-auth'
import { redirect } from 'next/navigation'
import { InactivityTimer } from '@/components/InactivityTimer'
import { AdminHeader } from '@/components/AdminHeader'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const wallet = await getWalletSession()
  if (!wallet || wallet !== process.env.ADMIN_WALLET) redirect('/')

  return (
    <div style={{ minHeight: '100vh', padding: '48px' }}>
      <InactivityTimer />
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <AdminHeader />
        {children}
      </div>
    </div>
  )
}
