'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/components/LanguageProvider'
import { Copy, CheckCircle, ExternalLink } from 'lucide-react'

type Cert = {
  id: string; arweave_tx_id: string; issued_to: string; doc_type: string
  issued_at: string; is_public: boolean
}

type NFT = { mint: string; owner: string }

export default function GalleryPage() {
  const { t } = useTranslation()
  const [tab, setTab]     = useState<'issued' | 'nfts'>('issued')
  const [certs, setCerts] = useState<Cert[]>([])
  const [nfts, setNfts]   = useState<NFT[]>([])
  const [copied, setCopied] = useState(false)
  const [slug, setSlug]   = useState('')
  const [monthVerifs, setMonthVerifs] = useState(0)

  useEffect(() => {
    fetch('/api/certificates?page=1&limit=100')
      .then(r => r.json())
      .then((d: { data: Cert[]; month_verifs?: number }) => {
        setCerts(d.data ?? [])
        setMonthVerifs(d.month_verifs ?? 0)
      })
      .catch(() => {})

    const cookieWallet = document.cookie
      .split('; ')
      .find(r => r.startsWith('session_active='))
      ?.split('=')[1]

    if (cookieWallet) {
      setSlug(cookieWallet.slice(0, 8))
      fetch(`/api/gallery/${cookieWallet}`)
        .then(r => r.json())
        .then((d: { nfts?: NFT[] }) => setNfts(d.nfts ?? []))
        .catch(() => setNfts([]))
    }
  }, [])

  const copyWidget = () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.solvikstudio.com'
    const code = `<a href="${appUrl}/i/${slug}" target="_blank" style="font-family:Inter,sans-serif;font-size:13px;color:#4ABAFF;text-decoration:none;border:1px solid rgba(74,186,255,0.3);border-radius:8px;padding:6px 14px;display:inline-block">✓ Verificado con Solvik Studio</a>`
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 8 }}>{t.gallery.title}</h1>

      {/* Verifications this month */}
      <div className="glass-card" style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 32, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#4ABAFF' }}>{monthVerifs}</p>
          <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.5)', fontFamily: 'Inter, sans-serif' }}>{t.gallery.verifications_month}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.4)', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>{t.gallery.widget_title}</p>
          <button onClick={copyWidget} className="btn-secondary" style={{ fontSize: 12, padding: '8px 16px' }}>
            {copied ? <><CheckCircle size={13} /> Copied!</> : <><Copy size={13} /> {t.gallery.copy_code}</>}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['issued', 'nfts'] as const).map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{ padding: '8px 20px', borderRadius: 50, border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, background: tab === tb ? '#4ABAFF' : 'rgba(0,50,120,0.3)', color: tab === tb ? '#fff' : 'rgba(180,210,255,0.6)' }}>
            {tb === 'issued' ? t.gallery.issued_tab : t.gallery.nft_tab}
          </button>
        ))}
      </div>

      {tab === 'issued' && (
        <div>
          {certs.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: 48, color: 'rgba(180,210,255,0.4)', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
              {t.gallery.no_certs}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {certs.map(c => (
                <div key={c.id} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 15, color: '#F0F8FF' }}>{c.issued_to}</p>
                    <span className={c.is_public ? 'badge-verified' : 'badge-pending'} style={{ fontSize: 10 }}>
                      {c.is_public ? t.gallery.toggle_public : 'Privado'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', fontFamily: 'Inter, sans-serif', marginBottom: 12 }}>{c.doc_type}</p>
                  <a href={`/verify/${c.arweave_tx_id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#4ABAFF', fontSize: 12, textDecoration: 'none' }}>
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
            <div className="glass-card" style={{ textAlign: 'center', padding: 48, color: 'rgba(180,210,255,0.4)', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
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
