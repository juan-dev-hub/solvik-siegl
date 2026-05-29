'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/components/LanguageProvider'
import { Copy, CheckCircle, ExternalLink, Eye, EyeOff } from 'lucide-react'

type Cert = {
  id: string; arweave_tx_id: string; issued_to: string; doc_type: string
  issued_at: string; is_public: boolean
}

type NFT = { mint: string; owner: string }

export default function GalleryPage() {
  const { t } = useTranslation()
  const [tab, setTab]           = useState<'issued' | 'nfts'>('issued')
  const [certs, setCerts]       = useState<Cert[]>([])
  const [nfts, setNfts]         = useState<NFT[]>([])
  const [copied, setCopied]     = useState(false)
  const [slug, setSlug]         = useState('')
  const [wallet, setWallet]     = useState('')
  const [monthVerifs, setMonthVerifs] = useState(0)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    // Get real wallet + slug from /api/me
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (d.issuer) {
          setWallet(d.issuer.wallet_address ?? '')
          setSlug(d.issuer.slug ?? '')
        }
      })
      .catch(() => {})

    fetch('/api/certificates?page=1&limit=100')
      .then(r => r.json())
      .then((d: { data: Cert[]; month_verifs?: number }) => {
        setCerts(d.data ?? [])
        setMonthVerifs(d.month_verifs ?? 0)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!wallet) return
    fetch(`/api/gallery/${wallet}`)
      .then(r => r.json())
      .then((d: { nfts?: NFT[] }) => setNfts(d.nfts ?? []))
      .catch(() => setNfts([]))
  }, [wallet])

  const copyWidget = () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.solvikstudio.com'
    const code = `<a href="${appUrl}/i/${slug}" target="_blank" style="font-family:Inter,sans-serif;font-size:13px;color:#4ABAFF;text-decoration:none;border:1px solid rgba(74,186,255,0.3);border-radius:8px;padding:6px 14px;display:inline-block">✓ Verificado con Solvik Studio</a>`
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const togglePublic = async (cert: Cert) => {
    if (toggling) return
    setToggling(cert.id)
    // Optimistic update
    setCerts(prev => prev.map(c => c.id === cert.id ? { ...c, is_public: !c.is_public } : c))
    try {
      const res = await fetch('/api/certificates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cert_id: cert.id, is_public: !cert.is_public }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revert on failure
      setCerts(prev => prev.map(c => c.id === cert.id ? { ...c, is_public: cert.is_public } : c))
    } finally {
      setToggling(null)
    }
  }

  return (
    <div>
      <h1 style={{ fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 8 }}>{t.gallery.title}</h1>

      {/* Stats + widget */}
      <div className="glass-card" style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#4ABAFF' }}>{monthVerifs}</p>
          <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.5)' }}>{t.gallery.verifications_month}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.4)', marginBottom: 8 }}>{t.gallery.widget_title}</p>
          <button onClick={copyWidget} className="btn-secondary" style={{ fontSize: 12, padding: '8px 16px' }}>
            {copied ? <><CheckCircle size={13} /> Copied!</> : <><Copy size={13} /> {t.gallery.copy_code}</>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['issued', 'nfts'] as const).map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{ padding: '8px 20px', borderRadius: 50, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: tab === tb ? '#4ABAFF' : 'rgba(0,50,120,0.3)', color: tab === tb ? '#fff' : 'rgba(180,210,255,0.6)' }}>
            {tb === 'issued' ? t.gallery.issued_tab : t.gallery.nft_tab}
          </button>
        ))}
      </div>

      {tab === 'issued' && (
        <div>
          {certs.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: 48, color: 'rgba(180,210,255,0.4)', fontSize: 14 }}>
              {t.gallery.no_certs}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {certs.map(c => (
                <div key={c.id} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: '#F0F8FF', flex: 1, marginRight: 8 }}>{c.issued_to}</p>
                    {/* Toggle public/private */}
                    <button
                      onClick={() => togglePublic(c)}
                      disabled={toggling === c.id}
                      title={c.is_public ? 'Clic para hacer privado' : 'Clic para hacer público'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: c.is_public ? 'rgba(0,212,255,0.12)' : 'rgba(180,210,255,0.06)',
                        border: `1px solid ${c.is_public ? 'rgba(0,212,255,0.35)' : 'rgba(180,210,255,0.15)'}`,
                        borderRadius: 20, padding: '3px 10px', cursor: 'pointer',
                        color: c.is_public ? '#00D4FF' : 'rgba(180,210,255,0.4)',
                        fontSize: 10, fontWeight: 600, flexShrink: 0,
                        opacity: toggling === c.id ? 0.5 : 1, transition: 'all 0.2s',
                      }}
                    >
                      {c.is_public ? <Eye size={11} /> : <EyeOff size={11} />}
                      {c.is_public ? 'Público' : 'Privado'}
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', marginBottom: 12 }}>{c.doc_type}</p>
                  <p style={{ fontSize: 11, color: 'rgba(180,210,255,0.3)', marginBottom: 12 }}>
                    {new Date(c.issued_at).toLocaleDateString('es-ES')}
                  </p>
                  <a href={`/verify/${c.arweave_tx_id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#4ABAFF', fontSize: 12, textDecoration: 'none' }}>
                    <ExternalLink size={12} /> Ver QR
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'nfts' && (
        <div>
          {nfts.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: 48, color: 'rgba(180,210,255,0.4)', fontSize: 14 }}>
              {t.gallery.no_nfts}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {nfts.map(n => (
                <div key={n.mint} className="glass-card" style={{ padding: 16 }}>
                  <p style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 11, color: 'rgba(180,210,255,0.5)', wordBreak: 'break-all' }}>{n.mint}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
