'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { ExternalLink, CheckCircle, ShoppingBag, ArrowDown, Shield } from 'lucide-react'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

type Issuer = {
  wallet_address: string
  institution_name: string
  slug: string
  sns_domain: string | null
  sns_verified: boolean
  registered_at: string
  page_active: boolean
  page_headline: string | null
  page_tagline: string | null
  page_about: string | null
  page_cta: string | null
}
type Cert = {
  id: string; arweave_tx_id: string; issued_to: string
  doc_type: string; issued_at: string
}
type Product = {
  id: string; title: string; description: string | null
  cover_arweave_id: string | null; price_usdc: number
  total_copies: number; sold_copies: number
}

// ─── Animated counter ───────────────────────────────────────────────────────
function AnimatedCounter({ target, label }: { target: number; label: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1600
          const start = Date.now()
          const tick = () => {
            const progress = Math.min((Date.now() - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.round(eased * target))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.4 },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <div ref={ref} style={{ textAlign: 'center', padding: '8px 0' }}>
      <p style={{
        fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, color: '#4ABAFF',
        lineHeight: 1, letterSpacing: '-0.03em',
        background: 'linear-gradient(130deg, #4ABAFF 0%, #B06FFF 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>
        {count}
      </p>
      <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.5)', marginTop: 8, fontWeight: 500 }}>{label}</p>
    </div>
  )
}

// ─── 3-D tilt card ──────────────────────────────────────────────────────────
function TiltCard({
  children, style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: y * -12, y: x * 12 })
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHovered(false) }}
      style={{
        transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: hovered ? 'transform 0.08s linear' : 'transform 0.5s ease',
        position: 'relative',
        ...style,
      }}
    >
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        background: `radial-gradient(circle at ${50 + tilt.y * 3}% ${50 - tilt.x * 3}%, rgba(74,186,255,0.10) 0%, transparent 65%)`,
        opacity: hovered ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none', zIndex: 1,
      }} />
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function IssuerPage() {
  const params = useParams<{ slug: string }>()
  const [issuer, setIssuer] = useState<Issuer | null>(null)
  const [certs, setCerts] = useState<Cert[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [filter, setFilter] = useState('all')

  const { scrollYProgress } = useScroll()
  const blob1Y = useTransform(scrollYProgress, [0, 1], ['0px', '-160px'])
  const blob2Y = useTransform(scrollYProgress, [0, 1], ['0px', '100px'])
  const heroY  = useTransform(scrollYProgress, [0, 0.4], ['0px', '-80px'])
  const heroOp = useTransform(scrollYProgress, [0, 0.35], [1, 0])

  useEffect(() => {
    if (!params.slug) return
    fetch(`/api/issuer/${params.slug}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then((d: { issuer: Issuer; certificates: Cert[] } | null) => {
        if (!d) return
        setIssuer(d.issuer)
        setCerts(d.certificates ?? [])
        return fetch(`/api/products/by-issuer/${d.issuer.wallet_address}`)
          .then(r => r.json())
          .catch(() => ({ products: [] }))
      })
      .then((pd: { products?: Product[] } | null) => {
        if (pd) setProducts(pd.products ?? [])
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [params.slug])

  // ── Loading ──
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{ width: 36, height: 36, border: '2px solid rgba(74,186,255,0.15)', borderTopColor: '#4ABAFF', borderRadius: '50%' }}
      />
    </div>
  )

  // ── Not found ──
  if (notFound || !issuer) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'rgba(180,210,255,0.5)' }}>Página no encontrada</p>
      <a href="/" className="btn-secondary" style={{ fontSize: 13 }}>← Volver al inicio</a>
    </div>
  )

  // ── Page inactive ──
  if (!issuer.page_active) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 4 }}>🔒</div>
      <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, color: '#F0F8FF' }}>
        {issuer.institution_name}
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.4)', maxWidth: 380 }}>
        Esta página pública aún no está activada.
      </p>
      <a href="/" className="btn-secondary" style={{ fontSize: 13, marginTop: 8 }}>← Volver al inicio</a>
    </div>
  )

  const docTypes = ['all', ...Array.from(new Set(certs.map(c => c.doc_type)))]
  const filteredCerts = filter === 'all' ? certs : certs.filter(c => c.doc_type === filter)
  const daysSinceJoin = Math.max(1, Math.floor(
    (Date.now() - new Date(issuer.registered_at).getTime()) / (1000 * 60 * 60 * 24),
  ))

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>

      {/* ── Animated background blobs ── */}
      <motion.div style={{
        y: blob1Y, position: 'fixed', top: '-10%', left: '-15%',
        width: '65vw', height: '65vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(123,47,255,0.28) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <motion.div style={{
        y: blob2Y, position: 'fixed', top: '25%', right: '-18%',
        width: '55vw', height: '55vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,255,0.18) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
        backgroundSize: '44px 44px',
        pointerEvents: 'none', zIndex: 0, opacity: 0.35,
      }} />

      {/* ── Navbar ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(12px, 2.5vw, 20px) clamp(16px, 5vw, 40px)',
        backdropFilter: 'blur(20px)', background: 'rgba(10,0,21,0.75)',
        borderBottom: '1px solid rgba(123,47,255,0.15)',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 26, objectFit: 'contain', borderRadius: 4 }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: '#F0F8FF' }}>Solvik Studio</span>
        </a>
        <LanguageSwitcher />
      </nav>

      {/* ── HERO ── */}
      <motion.section
        style={{ y: heroY, opacity: heroOp, position: 'relative', zIndex: 2 }}
      >
        <div style={{
          minHeight: 'calc(100svh - 65px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(48px, 10vw, 96px) clamp(20px, 6vw, 64px)',
          textAlign: 'center',
        }}>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{ marginBottom: 20 }}
          >
            {issuer.sns_verified && issuer.sns_domain ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,200,50,0.10)', border: '1px solid rgba(255,215,0,0.35)',
                borderRadius: 20, padding: '5px 16px', fontSize: 12, fontWeight: 700, color: '#FFD700',
              }}>
                <CheckCircle size={11} /> {issuer.sns_domain}
              </span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(74,186,255,0.08)', border: '1px solid rgba(74,186,255,0.22)',
                borderRadius: 20, padding: '5px 16px', fontSize: 12, fontWeight: 600,
                color: 'rgba(74,186,255,0.75)',
              }}>
                <Shield size={11} /> Verificado · Solvik Studio
              </span>
            )}
          </motion.div>

          {/* Institution name */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.18 }}
            style={{ fontSize: 'clamp(13px, 1.8vw, 16px)', color: 'rgba(180,210,255,0.45)', fontWeight: 600, marginBottom: 14, letterSpacing: '0.04em', textTransform: 'uppercase' }}
          >
            {issuer.institution_name}
          </motion.p>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.25 }}
            style={{
              fontSize: 'clamp(32px, 7.5vw, 80px)',
              fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.02,
              marginBottom: 22, maxWidth: 900,
              background: 'linear-gradient(130deg, #F0F0FF 10%, #B06FFF 50%, #00D4FF 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              wordBreak: 'normal', hyphens: 'none',
            }}
          >
            {issuer.page_headline || issuer.institution_name}
          </motion.h1>

          {/* Tagline */}
          {issuer.page_tagline && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.38 }}
              style={{
                fontSize: 'clamp(15px, 2.2vw, 22px)', color: 'rgba(180,210,255,0.6)',
                maxWidth: 620, lineHeight: 1.55, marginBottom: 44,
              }}
            >
              {issuer.page_tagline}
            </motion.p>
          )}
          {!issuer.page_tagline && <div style={{ marginBottom: 36 }} />}

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}
          >
            <a href="#certs" className="btn-primary" style={{ fontSize: 15, padding: '14px 32px' }}>
              {issuer.page_cta || 'Ver certificados'}
            </a>
            {products.length > 0 && (
              <a href="#store" className="btn-secondary" style={{ fontSize: 15, padding: '13px 28px' }}>
                <ShoppingBag size={16} /> Tienda
              </a>
            )}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)' }}
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              style={{ color: 'rgba(180,210,255,0.25)' }}
            >
              <ArrowDown size={22} />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* ── STATS ── */}
      <section style={{
        padding: 'clamp(40px, 8vw, 96px) clamp(20px, 6vw, 80px)',
        position: 'relative', zIndex: 2,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 180px), 1fr))`,
              gap: 'clamp(24px, 4vw, 48px)',
              padding: 'clamp(28px, 4vw, 52px)',
            }}
          >
            <AnimatedCounter target={certs.length} label="Certificados emitidos" />
            {products.length > 0 && (
              <AnimatedCounter target={products.length} label="Productos digitales" />
            )}
            <AnimatedCounter target={daysSinceJoin} label="Días en plataforma" />
          </motion.div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      {issuer.page_about && (
        <section style={{
          padding: 'clamp(16px, 4vw, 64px) clamp(20px, 6vw, 80px)',
          position: 'relative', zIndex: 2,
        }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(180,210,255,0.35)', marginBottom: 18, fontWeight: 600 }}
            >
              Acerca de
            </motion.p>
            <TiltCard style={{
              background: 'rgba(20,5,60,0.45)', backdropFilter: 'blur(24px)',
              border: '1px solid rgba(123,47,255,0.22)', borderRadius: 24,
              padding: 'clamp(24px, 4vw, 52px)',
            }}>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'rgba(180,210,255,0.72)', lineHeight: 1.75 }}
              >
                {issuer.page_about}
              </motion.p>
            </TiltCard>
          </div>
        </section>
      )}

      {/* ── CERTIFICATES ── */}
      <section id="certs" style={{
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 6vw, 80px)',
        position: 'relative', zIndex: 2,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            style={{ marginBottom: 32 }}
          >
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(180,210,255,0.35)', marginBottom: 10, fontWeight: 600 }}>
              Certificados
            </p>
            <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 38px)', fontWeight: 800, color: '#F0F8FF', letterSpacing: '-0.02em' }}>
              Emitidos por {issuer.institution_name}
            </h2>
          </motion.div>

          {/* Filter pills */}
          {docTypes.length > 2 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
              {docTypes.map(dt => (
                <motion.button
                  key={dt}
                  onClick={() => setFilter(dt)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    padding: '7px 18px', borderRadius: 50, border: 'none',
                    cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: filter === dt ? '#4ABAFF' : 'rgba(0,50,120,0.35)',
                    color: filter === dt ? '#fff' : 'rgba(180,210,255,0.6)',
                    transition: 'background 0.2s, color 0.2s',
                  }}
                >
                  {dt === 'all' ? 'Todos' : dt}
                </motion.button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {filteredCerts.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px 24px', color: 'rgba(180,210,255,0.35)', fontSize: 14 }}>
                  No hay certificados públicos aún.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
                  {filteredCerts.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.35) }}
                    >
                      <TiltCard style={{
                        background: 'rgba(20,5,60,0.45)', backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(123,47,255,0.18)', borderRadius: 16,
                        padding: 20, height: '100%',
                      }}>
                        <p style={{ fontWeight: 700, fontSize: 15, color: '#F0F8FF', marginBottom: 6 }}>{c.issued_to}</p>
                        <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', marginBottom: 10 }}>{c.doc_type}</p>
                        <p style={{ fontSize: 11, color: 'rgba(180,210,255,0.28)', marginBottom: 16 }}>
                          {new Date(c.issued_at).toLocaleDateString('es-ES')}
                        </p>
                        <a
                          href={`/verify/${c.arweave_tx_id}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#4ABAFF', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
                        >
                          <ExternalLink size={12} /> Verificar
                        </a>
                      </TiltCard>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── STORE ── */}
      {products.length > 0 && (
        <section id="store" style={{
          padding: 'clamp(40px, 8vw, 96px) clamp(20px, 6vw, 80px)',
          position: 'relative', zIndex: 2,
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              style={{ marginBottom: 32 }}
            >
              <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(180,210,255,0.35)', marginBottom: 10, fontWeight: 600 }}>
                Tienda
              </p>
              <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 38px)', fontWeight: 800, color: '#F0F8FF', letterSpacing: '-0.02em' }}>
                Productos digitales
              </h2>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
              {products.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.06, 0.35) }}
                >
                  <TiltCard style={{
                    background: 'rgba(20,5,60,0.45)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(123,47,255,0.18)', borderRadius: 16,
                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                  }}>
                    {p.cover_arweave_id && (
                      <img
                        src={`https://arweave.net/${p.cover_arweave_id}`}
                        alt={p.title}
                        style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }}
                      />
                    )}
                    <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: '#F0F8FF', marginBottom: 6 }}>{p.title}</p>
                      {p.description && (
                        <p style={{
                          fontSize: 12, color: 'rgba(180,210,255,0.5)', marginBottom: 14,
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          flex: 1, lineHeight: 1.5,
                        } as React.CSSProperties}>
                          {p.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <span style={{ color: '#4ABAFF', fontWeight: 800, fontSize: 16 }}>
                          ${(p.price_usdc / 1_000_000).toFixed(2)} USDC
                        </span>
                        <a href={`/store/${p.id}`} className="btn-primary" style={{ fontSize: 12, padding: '8px 18px' }}>
                          Ver más
                        </a>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ── */}
      <footer style={{
        padding: 'clamp(32px, 6vw, 64px) clamp(20px, 6vw, 60px)',
        borderTop: '1px solid rgba(123,47,255,0.10)',
        textAlign: 'center', position: 'relative', zIndex: 2,
      }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 12 }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 22, objectFit: 'contain', borderRadius: 3 }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: 'rgba(180,210,255,0.35)' }}>Solvik Studio</span>
        </a>
        <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.18)' }}>
          Certificados verificables en Arweave · {issuer.institution_name}
        </p>
      </footer>
    </div>
  )
}
