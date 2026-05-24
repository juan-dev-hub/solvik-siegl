'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/components/LanguageProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ExternalLink, CheckCircle, ShoppingBag } from 'lucide-react'
import gsap from 'gsap'

type Issuer = {
  wallet_address: string
  institution_name: string
  slug: string
  sns_domain: string | null
  sns_verified: boolean
}
type Cert = { id: string; arweave_tx_id: string; issued_to: string; doc_type: string; issued_at: string }
type Product = {
  id: string
  title: string
  description: string | null
  cover_arweave_id: string | null
  price_usdc: number
  total_copies: number
  sold_copies: number
}

export default function IssuerPage() {
  const { t } = useTranslation()
  const params = useParams<{ slug: string }>()
  const [issuer, setIssuer] = useState<Issuer | null>(null)
  const [certs, setCerts] = useState<Cert[]>([])
  const [tab, setTab] = useState<'issued' | 'nfts' | 'store'>('issued')
  const [nfts, setNfts] = useState<{ mint: string }[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!params.slug) return
    fetch(`/api/issuer/${params.slug}`)
      .then(r => r.json())
      .then((d: { issuer: Issuer; certificates: Cert[] }) => {
        setIssuer(d.issuer)
        setCerts(d.certificates ?? [])
        return Promise.all([
          fetch(`/api/gallery/${d.issuer.wallet_address}`).then(r => r.json()),
          fetch(`/api/products/by-issuer/${d.issuer.wallet_address}`)
            .then(r => r.json())
            .catch(() => ({ products: [] })),
        ])
      })
      .then(([galleryData, productsData]: [{ nfts: { mint: string }[] }, { products: Product[] }]) => {
        setNfts(galleryData.nfts ?? [])
        setProducts(productsData.products ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.slug])

  // GSAP cascade stagger every time the visible grid changes
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const cards = el.querySelectorAll('.grid-card')
    if (!cards.length) return
    gsap.from(cards, {
      opacity: 0,
      y: 30,
      duration: 0.45,
      ease: 'power2.out',
      stagger: { amount: 0.6, from: 'start', grid: 'auto' },
    })
  }, [tab, loading])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(180,210,255,0.5)' }}>
      ...
    </div>
  )
  if (!issuer) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b' }}>
      Issuer not found
    </div>
  )

  const tabs = [
    { id: 'issued' as const, label: `Certificados (${certs.length})` },
    { id: 'nfts' as const, label: 'Colección NFT' },
    { id: 'store' as const, label: 'Tienda' },
  ]

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(100,200,255,0.08)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 28, objectFit: 'contain', borderRadius: 4 }} />
          <span style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 16, color: '#F0F8FF' }}>Solvik Studio</span>
        </a>
        <LanguageSwitcher />
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 40px' }}>
        {/* Issuer header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ marginBottom: 40 }}
        >
          <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 36, color: '#F0F8FF', marginBottom: 10 }}>
            {issuer.institution_name}
          </h1>
          {issuer.sns_verified && issuer.sns_domain && (
            <span className="badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={12} /> {issuer.sns_domain}
            </span>
          )}
          <p style={{ marginTop: 12, fontSize: 13, color: 'rgba(180,210,255,0.35)', fontFamily: 'SF Mono, Fira Code, monospace' }}>
            {issuer.wallet_address}
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
          style={{ display: 'flex', gap: 8, marginBottom: 28 }}
        >
          {tabs.map(tb => (
            <motion.button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: '8px 20px', borderRadius: 50, border: 'none', cursor: 'pointer',
                fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 14,
                background: tab === tb.id ? '#4ABAFF' : 'rgba(0,50,120,0.3)',
                color: tab === tb.id ? '#fff' : 'rgba(180,210,255,0.6)',
                transition: 'background 0.2s',
              }}
            >
              {tb.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Tab content with slide transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {tab === 'issued' && (
              <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {certs.length === 0 ? (
                  <p style={{ color: 'rgba(180,210,255,0.4)', fontFamily: 'Luna, sans-serif' }}>{t.gallery.no_certs}</p>
                ) : certs.map(c => (
                  <div key={c.id} className="glass-card grid-card" style={{ padding: 20, overflow: 'hidden' }}>
                    <GlowCard>
                      <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 15, color: '#F0F8FF', marginBottom: 6 }}>{c.issued_to}</p>
                      <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', fontFamily: 'Luna, sans-serif', marginBottom: 12 }}>{c.doc_type}</p>
                      <a href={`/verify/${c.arweave_tx_id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#4ABAFF', fontSize: 12, textDecoration: 'none' }}>
                        <ExternalLink size={12} /> Verificar
                      </a>
                    </GlowCard>
                  </div>
                ))}
              </div>
            )}

            {tab === 'nfts' && (
              <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {nfts.length === 0 ? (
                  <p style={{ color: 'rgba(180,210,255,0.4)', fontFamily: 'Luna, sans-serif' }}>{t.gallery.no_nfts}</p>
                ) : nfts.map(n => (
                  <div key={n.mint} className="glass-card grid-card" style={{ padding: 16 }}>
                    <GlowCard>
                      <p style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 10, color: 'rgba(180,210,255,0.5)', wordBreak: 'break-all' }}>{n.mint}</p>
                    </GlowCard>
                  </div>
                ))}
              </div>
            )}

            {tab === 'store' && (
              <div ref={gridRef}>
                {products.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <ShoppingBag size={40} color="rgba(180,210,255,0.2)" style={{ margin: '0 auto 16px', display: 'block' }} />
                    <p style={{ color: 'rgba(180,210,255,0.4)', fontFamily: 'Luna, sans-serif', fontSize: 16 }}>
                      Esta institución no tiene productos en venta aún.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {products.map(p => (
                      <div key={p.id} className="glass-card grid-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <GlowCard>
                          {p.cover_arweave_id && (
                            <img
                              src={`https://arweave.net/${p.cover_arweave_id}`}
                              alt={p.title}
                              style={{ width: '100%', height: 140, objectFit: 'cover' }}
                            />
                          )}
                          <div style={{ padding: 20 }}>
                            <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 15, color: '#F0F8FF', marginBottom: 6 }}>{p.title}</p>
                            {p.description && (
                              <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', fontFamily: 'Luna, sans-serif', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                                {p.description}
                              </p>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#4ABAFF', fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 16 }}>
                                ${(p.price_usdc / 1_000_000).toFixed(2)} USDC
                              </span>
                              <a
                                href={`/store/${p.id}`}
                                style={{ background: '#4ABAFF', color: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'Luna, sans-serif' }}
                              >
                                Ver más
                              </a>
                            </div>
                          </div>
                        </GlowCard>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Widget embed */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.2 }}
          style={{ marginTop: 48 }}
        >
          <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 16, color: '#F0F8FF', marginBottom: 8 }}>{t.gallery.widget_title}</p>
          <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.5)', fontFamily: 'Luna, sans-serif', marginBottom: 16 }}>{t.gallery.widget_desc}</p>
          <code style={{ display: 'block', background: 'rgba(0,15,50,0.6)', border: '1px solid rgba(74,186,255,0.15)', borderRadius: 8, padding: '12px 16px', fontSize: 11, color: '#4ABAFF', fontFamily: 'SF Mono, Fira Code, monospace', wordBreak: 'break-all' }}>
            {`<a href="https://www.solvikstudio.com/i/${issuer.slug}" target="_blank">✓ Verificado con Solvik Studio · ${certs.length} certificados</a>`}
          </code>
        </motion.div>

        <p style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: 'rgba(180,210,255,0.2)', fontFamily: 'Luna, sans-serif' }}>
          powered by Solvik Studio
        </p>
      </div>
    </div>
  )
}

// Subtle glow that "breathes" on hover via GSAP
function GlowCard({ children }: { children: React.ReactNode }) {
  const glowRef = useRef<HTMLDivElement>(null)
  const tween = useRef<gsap.core.Tween | null>(null)

  const handleEnter = () => {
    if (!glowRef.current) return
    tween.current?.kill()
    tween.current = gsap.to(glowRef.current, {
      opacity: 0.6, scale: 1.05, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut',
    })
  }
  const handleLeave = () => {
    tween.current?.kill()
    if (glowRef.current) gsap.to(glowRef.current, { opacity: 0, scale: 1, duration: 0.3 })
  }

  return (
    <div style={{ position: 'relative' }} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <div
        ref={glowRef}
        style={{
          position: 'absolute', inset: -4, borderRadius: 16,
          background: 'radial-gradient(circle, rgba(74,186,255,0.15) 0%, transparent 70%)',
          opacity: 0, pointerEvents: 'none', zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
