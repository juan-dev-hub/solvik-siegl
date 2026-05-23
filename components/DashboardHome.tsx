'use client'
import { ReactNode, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { animate } from 'framer-motion'
import { useTranslation } from '@/components/LanguageProvider'
import { LOCALE_DATE } from '@/lib/i18n'
import { Award, TrendingUp, BarChart2, ExternalLink } from 'lucide-react'

type Issuer = {
  wallet_address: string
  institution_name: string
  plan: string
  credits: number
  plan_expires_at: string | null
}

type Cert = {
  id: string
  arweave_tx_id: string
  issued_to: string
  doc_type: string
  issued_at: string
}

type Props = {
  wallet: string
  issuer: Issuer | null
  totalCerts: number
  recentCerts: Cert[]
  monthVerifications: number
  updateNameSlot: ReactNode
}

function truncate(s: string) { return `${s.slice(0, 4)}...${s.slice(-4)}` }

function AnimatedNumber({ value, color }: { value: number; color: string }) {
  const spanRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    const node = spanRef.current
    if (!node) return
    const controls = animate(0, value, {
      duration: 1.2,
      ease: 'easeOut',
      onUpdate(v) { node.textContent = Math.round(v).toString() },
    })
    return () => controls.stop()
  }, [value])
  return (
    <p
      ref={spanRef}
      style={{ fontSize: 28, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color }}
    >
      0
    </p>
  )
}


export function DashboardHome({ wallet, issuer, totalCerts, recentCerts, monthVerifications, updateNameSlot }: Props) {
  const { t, locale } = useTranslation()
  const dateLocale = LOCALE_DATE[locale]

  const lowCredits = (issuer?.credits ?? 0) < 3

  const stats = [
    { icon: <Award size={20} color="#4ABAFF" />, label: t.dashboard.credits, value: issuer?.credits ?? 0, color: '#4ABAFF' },
    { icon: <BarChart2 size={20} color="#52C878" />, label: t.dashboard.total_certs, value: totalCerts, color: '#52C878' },
    { icon: <TrendingUp size={20} color="#00D4AA" />, label: 'Verificaciones este mes', value: monthVerifications, color: '#00D4AA' },
  ]

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 4 }}
      >
        {issuer?.institution_name ?? 'Dashboard'}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        style={{ color: 'rgba(180,210,255,0.4)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginBottom: 32 }}
      >
        <span className="wallet-address">{truncate(wallet)}</span>
      </motion.p>

      {updateNameSlot}

      {/* Low credits warning */}
      {lowCredits && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ background: 'rgba(255,229,102,0.08)', border: '1px solid rgba(255,229,102,0.3)', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <p style={{ color: '#FFE566', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 15 }}>⚠ {t.dashboard.low_credits}</p>
            <p style={{ color: 'rgba(255,229,102,0.6)', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>{t.dashboard.low_credits_desc}</p>
          </div>
          <motion.a
            href="/pricing"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-secondary"
            style={{ fontSize: 13, padding: '8px 18px', color: '#FFE566', borderColor: 'rgba(255,229,102,0.4)', textDecoration: 'none' }}
          >
            {t.dashboard.buy_credits}
          </motion.a>
        </motion.div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="glass-card"
            style={{ display: 'flex', alignItems: 'center', gap: 16 }}
          >
            <div style={{ background: `${s.color}18`, borderRadius: 10, padding: 10 }}>{s.icon}</div>
            <div>
              <AnimatedNumber value={s.value} color={s.color} />
              <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', fontFamily: 'Inter, sans-serif' }}>{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Plan card */}
      {issuer?.plan && issuer.plan !== 'free' ? (
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.24 }}
          style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.45)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {t.dashboard.current_plan}
            </p>
            <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 20, color: '#F0F8FF', textTransform: 'capitalize' }}>
              {issuer.plan}
            </p>
          </div>
          {issuer.plan_expires_at && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.45)', fontFamily: 'Inter, sans-serif', marginBottom: 4 }}>{t.dashboard.renews}</p>
              <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.7)', fontFamily: 'Inter, sans-serif' }}>
                {new Date(issuer.plan_expires_at).toLocaleDateString(dateLocale)}
              </p>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.24 }}
          style={{ marginBottom: 32, background: 'rgba(0,80,160,0.15)', borderColor: 'rgba(74,186,255,0.2)' }}
        >
          <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 16, color: '#4ABAFF', marginBottom: 6 }}>{t.dashboard.no_plan}</p>
          <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.55)', fontFamily: 'Inter, sans-serif', marginBottom: 16 }}>{t.dashboard.no_plan_desc}</p>
          <motion.a
            href="/pricing"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary"
            style={{ fontSize: 14, display: 'inline-block' }}
          >
            {t.dashboard.see_plans}
          </motion.a>
        </motion.div>
      )}

      {/* Recent certs */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.32 }}
      >
        <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 16, color: '#F0F8FF', marginBottom: 20 }}>{t.dashboard.recent}</p>
        {recentCerts.length === 0 ? (
          <p style={{ color: 'rgba(180,210,255,0.35)', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>{t.dashboard.no_certs}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
            <tbody>
              {recentCerts.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(100,200,255,0.06)' }}>
                  <td style={{ padding: '10px 0', color: '#F0F8FF', fontWeight: 500 }}>{c.issued_to}</td>
                  <td style={{ padding: '10px 0', color: 'rgba(180,210,255,0.5)', fontSize: 12 }}>{c.doc_type}</td>
                  <td style={{ padding: '10px 0', color: 'rgba(180,210,255,0.4)', fontSize: 12 }}>
                    {new Date(c.issued_at).toLocaleDateString(dateLocale)}
                  </td>
                  <td style={{ padding: '10px 0', textAlign: 'right' }}>
                    <a href={`/verify/${c.arweave_tx_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4ABAFF', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, textDecoration: 'none' }}>
                      <ExternalLink size={12} /> QR
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  )
}
