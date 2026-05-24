'use client'
import { LogOut } from 'lucide-react'
import { useTranslation } from '@/components/LanguageProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export function AdminHeader() {
  const { t } = useTranslation()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 32, objectFit: 'contain', borderRadius: 6 }} />
        <span style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 20, color: '#F0F8FF' }}>Admin</span>
        <span className="badge-pending">{t.admin.only_you}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <LanguageSwitcher />
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,80,80,0.12)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 50, padding: '8px 18px', color: '#ff6b6b', cursor: 'pointer', fontSize: 13, fontFamily: 'Luna, sans-serif' }}>
          <LogOut size={14} />{t.admin.logout}
        </button>
      </div>
    </div>
  )
}
