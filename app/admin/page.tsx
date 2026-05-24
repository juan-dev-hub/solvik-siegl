'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/components/LanguageProvider'
import { Loader2, CheckCircle } from 'lucide-react'

type Stats = {
  total_usdc: number
  month_usdc: number
  monthly_usdc: Record<string, number>
  active_issuers: number
  total_certificates: number
  fee_pool_balance_sol: number
  contract_wallet_balance_usdc: number
  ready_to_activate: boolean
  contract_active: boolean
  issuers: Array<{
    wallet_address: string; institution_name: string; plan: string
    credits: number; cert_count: number; registered_at: string; sns_verified: boolean
  }>
}

export default function AdminPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Activation modal state
  const [showModal, setShowModal]   = useState(false)
  const [programId, setProgramId]   = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [activating, setActivating] = useState(false)
  const [activated, setActivated]   = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then((d: Stats) => setStats(d)).finally(() => setLoading(false))
  }, [])

  const handleActivate = async () => {
    if (confirmText !== 'CONFIRMAR' && confirmText !== 'CONFIRM') return
    setActivating(true)
    try {
      const res = await fetch('/api/admin/activate-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ program_id: programId, confirm: true }),
      })
      if (res.ok) { setActivated(true); setShowModal(false) }
    } finally { setActivating(false) }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Loader2 size={32} color="#4ABAFF" className="animate-spin" /></div>
  if (!stats) return null

  const contractProgress = Math.min(100, (stats.contract_wallet_balance_usdc / 25) * 100)

  return (
    <div>
      <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 32, color: '#F0F8FF', marginBottom: 40 }}>
        {t.admin.title}
      </h1>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
        {[
          { label: t.admin.revenue_month, value: `$${stats.month_usdc.toFixed(2)}`, color: '#4ABAFF' },
          { label: t.admin.revenue_total, value: `$${stats.total_usdc.toFixed(2)}`, color: '#00D4AA' },
          { label: t.admin.active_issuers, value: stats.active_issuers, color: '#52C878' },
          { label: t.admin.total_certs, value: stats.total_certificates, color: '#FFE566' },
          { label: t.admin.fee_pool_sol, value: `${stats.fee_pool_balance_sol.toFixed(4)} SOL`, color: '#FF9F0A' },
          { label: t.admin.contract_balance, value: `$${stats.contract_wallet_balance_usdc.toFixed(2)}`, color: stats.ready_to_activate ? '#52C878' : '#4ABAFF' },
        ].map(s => (
          <div key={s.label} className="glass-card">
            <p style={{ fontSize: 28, fontFamily: 'Luna, sans-serif', fontWeight: 800, color: s.color as string }}>{String(s.value)}</p>
            <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.45)', fontFamily: 'Luna, sans-serif', marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Smart contract card */}
      <div className="glass-card" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 20, color: '#F0F8FF', marginBottom: 6 }}>{t.admin.activate_title}</h2>
            <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.5)', fontFamily: 'Luna, sans-serif' }}>{t.admin.activate_desc}</p>
          </div>
          <span className={stats.ready_to_activate ? 'badge-verified' : 'badge-pending'}>
            {stats.ready_to_activate ? t.admin.ready : t.admin.not_ready}
          </span>
        </div>

        <div style={{ background: 'rgba(0,20,60,0.4)', borderRadius: 50, height: 10, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ width: `${contractProgress}%`, height: '100%', background: stats.ready_to_activate ? 'linear-gradient(90deg, #52C878, #00D4AA)' : 'linear-gradient(90deg, #4ABAFF, #00D4AA)', borderRadius: 50, transition: 'width 0.5s ease' }} />
        </div>
        <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.5)', fontFamily: 'Luna, sans-serif', marginBottom: 20 }}>
          ${stats.contract_wallet_balance_usdc.toFixed(2)} / $25.00
        </p>

        {stats.contract_active || activated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#52C878', fontFamily: 'Luna, sans-serif', fontWeight: 700 }}>
            <CheckCircle size={20} /> Contract active
          </div>
        ) : (
          <button
            className="btn-primary"
            disabled={!stats.ready_to_activate}
            onClick={() => setShowModal(true)}
          >
            {t.admin.activate_btn}
          </button>
        )}
      </div>

      {/* Monthly chart (text-based) */}
      <div className="glass-card" style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 18, color: '#F0F8FF', marginBottom: 24 }}>{t.admin.monthly_chart}</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 120 }}>
          {Object.entries(stats.monthly_usdc).map(([month, amount]) => {
            const max = Math.max(...Object.values(stats.monthly_usdc), 1)
            const h = Math.max(4, (amount / max) * 100)
            return (
              <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 10, color: '#4ABAFF', fontFamily: 'Luna, sans-serif', fontWeight: 700 }}>${amount.toFixed(0)}</p>
                <div style={{ width: '100%', height: `${h}%`, background: 'linear-gradient(180deg, #4ABAFF, #0066CC)', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                <p style={{ fontSize: 10, color: 'rgba(180,210,255,0.4)', fontFamily: 'Luna, sans-serif' }}>{month.slice(5)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Issuers table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(100,200,255,0.1)' }}>
          <h2 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 18, color: '#F0F8FF' }}>{t.admin.issuers_title}</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Luna, sans-serif', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(100,200,255,0.1)' }}>
              {[t.admin.col_institution, t.admin.col_wallet, t.admin.col_plan, t.admin.col_credits, t.admin.col_certs, t.admin.col_sns].map(h => (
                <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'rgba(180,210,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.issuers.map(iss => (
              <tr key={iss.wallet_address} style={{ borderBottom: '1px solid rgba(100,200,255,0.06)' }}>
                <td style={{ padding: '12px 20px', color: '#F0F8FF', fontWeight: 500 }}>{iss.institution_name}</td>
                <td style={{ padding: '12px 20px' }}>
                  <span className="wallet-address" style={{ fontSize: 11 }}>{iss.wallet_address.slice(0, 8)}...</span>
                </td>
                <td style={{ padding: '12px 20px', color: 'rgba(180,210,255,0.7)', textTransform: 'capitalize' }}>{iss.plan}</td>
                <td style={{ padding: '12px 20px', color: 'rgba(180,210,255,0.7)' }}>{iss.credits}</td>
                <td style={{ padding: '12px 20px', color: 'rgba(180,210,255,0.7)' }}>{iss.cert_count}</td>
                <td style={{ padding: '12px 20px' }}>
                  {iss.sns_verified ? <span className="badge-verified" style={{ fontSize: 10 }}>✓</span> : <span style={{ color: 'rgba(180,210,255,0.2)', fontSize: 12 }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Activation modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ maxWidth: 480, width: '100%', margin: 24 }}>
            <h2 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 22, color: '#F0F8FF', marginBottom: 12 }}>{t.admin.confirm_title}</h2>
            <p style={{ fontSize: 14, color: '#FFE566', fontFamily: 'Luna, sans-serif', marginBottom: 24, lineHeight: 1.6 }}>
              ⚠️ {t.admin.confirm_warning}
            </p>
            <label style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Luna, sans-serif' }}>{t.admin.program_id_label}</label>
            <input value={programId} onChange={e => setProgramId(e.target.value)} placeholder="58Pbj3wm..." />
            <label style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Luna, sans-serif' }}>{t.admin.confirm_type}</label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="CONFIRMAR" />
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={() => setShowModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                {t.common.cancel}
              </button>
              <button
                onClick={handleActivate}
                disabled={activating || (confirmText !== 'CONFIRMAR' && confirmText !== 'CONFIRM') || !programId}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center', background: 'linear-gradient(180deg, rgba(255,80,80,0.9), rgba(200,0,0,1))' }}
              >
                {activating ? <Loader2 size={16} className="animate-spin" /> : t.admin.confirm_btn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
