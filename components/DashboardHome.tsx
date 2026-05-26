'use client'
import { ReactNode, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { animate } from 'framer-motion'
import { useTranslation } from '@/components/LanguageProvider'
import { LOCALE_DATE } from '@/lib/i18n'
import { HardDrive, TrendingUp, BarChart2, ExternalLink } from 'lucide-react'

type Issuer = {
  wallet_address: string
  institution_name: string
  storage_used_bytes: number
  storage_limit_bytes: number
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
    <p ref={spanRef} style={{ fontSize: 28, fontFamily: 'Luna, sans-serif', fontWeight: 800, color }}>
      0
    </p>
  )
}

function StorageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const usedMB  = Math.round(used  / 1_048_576)
  const limitMB = Math.round(limit / 1_048_576)
  const color = pct > 90 ? '#FF6B6B' : pct > 70 ? '#FFD700' : '#00FFB3'

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'rgba(240,240,255,0.5)', fontFamily: 'Luna, sans-serif' }}>
          Almacenamiento usado
        </span>
        <span style={{ fontSize: 12, color, fontFamily: 'Luna, sans-serif', fontWeight: 700 }}>
          {usedMB} MB / {limitMB} MB
        </span>
      </div>
      <div style={{ height: 8, background: 'rgba(123,47,255,0.2)', borderRadius: 8, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 8 }}
        />
      </div>
    </div>
  )
}

export function DashboardHome({ wallet, issuer, totalCerts, recentCerts, monthVerifications, updateNameSlot }: Props) {
  const { t, locale } = useTranslation()
  const dateLocale = LOCALE_DATE[locale]

  const storageMB  = Math.round((issuer?.storage_used_bytes ?? 0) / 1_048_576)
  const limitMB    = Math.round((issuer?.storage_limit_bytes ?? 0) / 1_048_576)
  const pctUsed    = limitMB > 0 ? (storageMB / limitMB) * 100 : 0
  const lowStorage = pctUsed > 80

  const stats = [
    { icon: <HardDrive size={20} color="#00D4FF" />, label: t.dashboard.credits, value: limitMB - storageMB, color: '#00D4FF' },
    { icon: <BarChart2 size={20} color="#00FFB3" />, label: t.dashboard.total_certs, value: totalCerts, color: '#00FFB3' },
    { icon: <TrendingUp size={20} color="#B06FFF" />, label: 'Verificaciones este mes', value: monthVerifications, color: '#B06FFF' },
  ]

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 28, color: '#F0F0FF', marginBottom: 4 }}
      >
        {issuer?.institution_name ?? 'Dashboard'}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        style={{ color: 'rgba(240,240,255,0.4)', fontSize: 13, fontFamily: 'Luna, sans-serif', marginBottom: 32 }}
      >
        <span className="wallet-address">{truncate(wallet)}</span>
      </motion.p>

      {updateNameSlot}

      {/* Low storage warning */}
      {lowStorage && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div>
            <p style={{ color: '#FFD700', fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 15 }}>⚠ {t.dashboard.low_credits}</p>
            <p style={{ color: 'rgba(255,215,0,0.6)', fontSize: 13, fontFamily: 'Luna, sans-serif' }}>{t.dashboard.low_credits_desc}</p>
          </div>
          <motion.a
            href="/pricing"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-secondary"
            style={{ fontSize: 13, padding: '8px 18px', textDecoration: 'none' }}
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
              <p style={{ fontSize: 12, color: 'rgba(240,240,255,0.5)', fontFamily: 'Luna, sans-serif' }}>{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Storage progress */}
      {issuer && issuer.storage_limit_bytes > 0 && (
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.2 }}
          style={{ marginBottom: 32 }}
        >
          <StorageBar
            used={issuer.storage_used_bytes}
            limit={issuer.storage_limit_bytes}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <motion.a
              href="/pricing"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="btn-secondary"
              style={{ fontSize: 12, padding: '6px 16px', textDecoration: 'none' }}
            >
              {t.dashboard.buy_credits}
            </motion.a>
          </div>
        </motion.div>
      )}

      {/* No plan */}
      {!issuer || issuer.storage_limit_bytes === 0 ? (
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.24 }}
          style={{ marginBottom: 32, background: 'rgba(123,47,255,0.10)', borderColor: 'rgba(123,47,255,0.25)' }}
        >
          <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 16, color: '#B06FFF', marginBottom: 6 }}>{t.dashboard.no_plan}</p>
          <p style={{ fontSize: 14, color: 'rgba(240,240,255,0.55)', fontFamily: 'Luna, sans-serif', marginBottom: 16 }}>{t.dashboard.no_plan_desc}</p>
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
      ) : null}

      {/* Recent certs */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.32 }}
      >
        <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 16, color: '#F0F0FF', marginBottom: 20 }}>{t.dashboard.recent}</p>
        {recentCerts.length === 0 ? (
          <p style={{ color: 'rgba(240,240,255,0.35)', fontFamily: 'Luna, sans-serif', fontSize: 14 }}>{t.dashboard.no_certs}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Luna, sans-serif', fontSize: 14 }}>
            <tbody>
              {recentCerts.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(123,47,255,0.08)' }}>
                  <td style={{ padding: '10px 0', color: '#F0F0FF', fontWeight: 500 }}>{c.issued_to}</td>
                  <td style={{ padding: '10px 0', color: 'rgba(240,240,255,0.5)', fontSize: 12 }}>{c.doc_type}</td>
                  <td style={{ padding: '10px 0', color: 'rgba(240,240,255,0.4)', fontSize: 12 }}>
                    {new Date(c.issued_at).toLocaleDateString(dateLocale)}
                  </td>
                  <td style={{ padding: '10px 0', textAlign: 'right' }}>
                    <a href={`/verify/${c.arweave_tx_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#00D4FF', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, textDecoration: 'none' }}>
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
