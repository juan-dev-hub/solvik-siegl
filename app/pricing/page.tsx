'use client'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/components/LanguageProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { WalletAuthButton } from '@/components/WalletAuthButton'
import { CheckCircle, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'qrcode'

const PLANS = [
  {
    id: 'starter', price: 49, storage: '1 GB',
    features: ['1 GB almacenamiento permanente', 'PDF + QR verificable', 'Arweave permanente', 'Solana cNFT'],
  },
  {
    id: 'pro', price: 99, storage: '5 GB', popular: true,
    features: ['5 GB almacenamiento permanente', 'PDF + QR verificable', 'Arweave permanente', 'Solana cNFT', 'Attestation on-chain', 'Badge dominio SNS'],
  },
  {
    id: 'studio', price: 249, storage: '20 GB',
    features: ['20 GB almacenamiento permanente', 'PDF + QR verificable', 'Arweave permanente', 'Solana cNFT', 'Attestation on-chain', 'Badge dominio SNS', 'Batch ZIP', 'Página pública de issuer'],
  },
]

type ModalState = {
  title: string
  qrDataUrl: string
  reference: string
  endpoint: string
  body: Record<string, string>
}

export default function PricingPage() {
  const { t } = useTranslation()
  const [hasSession, setHasSession] = useState(false)
  const [loading, setLoading]       = useState<string | null>(null)
  const [modal, setModal]           = useState<ModalState | null>(null)
  const [pollStatus, setPollStatus] = useState<'waiting' | 'success'>('waiting')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setHasSession(document.cookie.includes('session_active=1'))
  }, [])

  useEffect(() => {
    if (!modal) {
      if (pollRef.current) clearInterval(pollRef.current)
      if (pollStatus !== 'success') setPollStatus('waiting')
    }
  }, [modal])

  async function openQR(
    qrParam: Record<string, string>,
    title: string,
    apiEndpoint: string,
    apiBody: Record<string, string>,
  ) {
    setLoading(title)
    try {
      const qs  = new URLSearchParams(qrParam).toString()
      const res = await fetch(`/api/pay/qr?${qs}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const qrDataUrl = await QRCode.toDataURL(data.url, {
        width: 280,
        margin: 2,
        color: { dark: '#0a0015', light: '#f0f0ff' },
      })

      setModal({ title, qrDataUrl, reference: data.reference, endpoint: apiEndpoint, body: apiBody })
      startPolling(data.reference, apiEndpoint, apiBody)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error generando QR')
    } finally {
      setLoading(null)
    }
  }

  function startPolling(reference: string, endpoint: string, body: Record<string, string>) {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/pay/status?reference=${reference}`)
        const data = await res.json()
        if (!data.found) return

        clearInterval(pollRef.current!)
        setPollStatus('success')

        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, tx_hash: data.signature }),
        })

        setTimeout(() => { window.location.href = '/dashboard' }, 1500)
      } catch {
        // seguimos polling
      }
    }, 2000)
  }

  const handleBuyPlan = (planId: string) =>
    openQR({ plan: planId }, `Plan ${planId}`, '/api/subscribe', { plan_id: planId })

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(123,47,255,0.1)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 32, objectFit: 'contain', borderRadius: 6 }} />
          <span style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 18, color: '#F0F0FF' }}>Solvik Studio</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <LanguageSwitcher />
          <WalletAuthButton />
        </div>
      </nav>

      <div className="page-container">
        <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 40, color: '#F0F0FF', textAlign: 'center', marginBottom: 12 }}>
          {t.pricing.title}
        </h1>
        <p style={{ textAlign: 'center', color: 'rgba(240,240,255,0.55)', fontSize: 16, fontFamily: 'Luna, sans-serif', marginBottom: 48 }}>
          {t.pricing.sub}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
          {PLANS.map(p => (
            <div key={p.id} className="glass-card" style={{ border: p.popular ? '1px solid #7B2FFF' : undefined, position: 'relative' }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #7B2FFF, #00D4FF)', color: '#fff', borderRadius: 50, padding: '3px 18px', fontSize: 11, fontWeight: 700, fontFamily: 'Luna, sans-serif', whiteSpace: 'nowrap' }}>
                  {t.landing.most_popular}
                </div>
              )}
              <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 22, color: '#F0F0FF', textTransform: 'capitalize', marginBottom: 6 }}>{p.id}</p>
              <p style={{ fontSize: 40, fontFamily: 'Luna, sans-serif', fontWeight: 800, color: '#7B2FFF', lineHeight: 1 }}>
                ${p.price}<span style={{ fontSize: 16, color: 'rgba(240,240,255,0.5)', fontWeight: 400 }}>{t.landing.per_month}</span>
              </p>
              <p style={{ fontSize: 14, color: '#00D4FF', fontFamily: 'Luna, sans-serif', marginBottom: 24, marginTop: 6, fontWeight: 600 }}>
                {p.storage} {t.landing.credits}
              </p>
              <div style={{ marginBottom: 28 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <CheckCircle size={14} color="#00FFB3" />
                    <span style={{ fontSize: 13, color: 'rgba(240,240,255,0.7)', fontFamily: 'Luna, sans-serif' }}>{f}</span>
                  </div>
                ))}
              </div>
              {hasSession ? (
                <motion.button
                  onClick={() => handleBuyPlan(p.id)}
                  disabled={loading !== null}
                  whileHover={!loading ? { scale: 1.03 } : {}}
                  whileTap={!loading ? { scale: 0.97 } : {}}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading === `Plan ${p.id}` ? <><Loader2 size={14} className="animate-spin" /> Generando QR...</> : `Empezar hoy — $${p.price}/mes`}
                </motion.button>
              ) : (
                <a href="/" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>{t.common.connect}</a>
              )}
            </div>
          ))}
        </div>

        {/* First payment note */}
        <div style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 12, padding: '14px 20px', textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 13, color: 'rgba(0,212,255,0.8)', fontFamily: 'Luna, sans-serif', lineHeight: 1.6 }}>
            ℹ️ {t.landing.first_payment_note}
          </p>
        </div>

        <div style={{ background: 'rgba(123,47,255,0.06)', border: '1px solid rgba(123,47,255,0.15)', borderRadius: 16, padding: '24px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgba(240,240,255,0.6)', fontFamily: 'Luna, sans-serif', lineHeight: 1.7 }}>
            {t.landing.disclaimer_card}
          </p>
        </div>
      </div>

      {/* Modal QR */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              style={{ position: 'relative', background: 'rgba(10,0,30,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(123,47,255,0.3)', borderRadius: 20, padding: 36, textAlign: 'center', maxWidth: 380, width: '90%' }}
            >
              <button
                onClick={() => setModal(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'rgba(240,240,255,0.4)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>

              {pollStatus === 'success' ? (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                  <CheckCircle size={64} color="#00FFB3" style={{ margin: '0 auto 16px' }} />
                  <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 22, color: '#00FFB3', marginBottom: 8 }}>¡Pago confirmado!</p>
                  <p style={{ fontSize: 14, color: 'rgba(240,240,255,0.5)', fontFamily: 'Luna, sans-serif' }}>Redirigiendo al dashboard...</p>
                </motion.div>
              ) : (
                <>
                  <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 20, color: '#F0F0FF', marginBottom: 6 }}>
                    {modal.title}
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(240,240,255,0.5)', fontFamily: 'Luna, sans-serif', marginBottom: 24 }}>
                    Pago con USDC en Solana
                  </p>
                  <img
                    src={modal.qrDataUrl}
                    alt="QR de pago"
                    style={{ width: 240, height: 240, borderRadius: 12, margin: '0 auto 20px', display: 'block' }}
                  />
                  <div style={{ background: 'rgba(123,47,255,0.08)', border: '1px solid rgba(123,47,255,0.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                    <p style={{ fontSize: 12, color: 'rgba(240,240,255,0.75)', fontFamily: 'Luna, sans-serif', lineHeight: 1.6 }}>
                      Apunta la <strong style={{ color: '#00D4FF' }}>cámara de tu teléfono</strong> al código QR — tu wallet se abrirá automáticamente.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(240,240,255,0.4)', fontSize: 13, fontFamily: 'Luna, sans-serif' }}>
                    <Loader2 size={14} className="animate-spin" />
                    Esperando confirmación...
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
