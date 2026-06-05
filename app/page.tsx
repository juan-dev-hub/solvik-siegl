'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/components/LanguageProvider'
import { WalletAuthButton } from '@/components/WalletAuthButton'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ShieldCheck, KeyRound, Globe, Zap, Menu, X } from 'lucide-react'
import { HeroTitle } from '@/components/HeroTitle'

const PRODUCTS = [
  {
    id: 'pechat',
    label: 'Solvik Pečat',
    tag: 'Certificación',
    href: '/pechat',
    color: '#7B2FFF',
    bg: 'rgba(123,47,255,0.08)',
    border: 'rgba(123,47,255,0.25)',
    desc: 'Certificados, credenciales y documentos sellados en blockchain. Verificables al instante — en cualquier parte del mundo, para siempre.',
    cta: 'Ver Pečat →',
  },
  {
    id: 'torg',
    label: 'Solvik Torg',
    tag: 'Comercio digital',
    href: '/torg',
    color: '#00D4AA',
    bg: 'rgba(0,212,170,0.07)',
    border: 'rgba(0,212,170,0.2)',
    desc: 'Vende ebooks, cursos, software y cualquier activo digital. El 70% llega a tu wallet al instante. Sin intermediarios.',
    cta: 'Ver Torg →',
  },
  {
    id: 'vault',
    label: 'Solvik Vault',
    tag: 'Almacenamiento',
    href: '/vault',
    color: '#4ABAFF',
    bg: 'rgba(74,186,255,0.07)',
    border: 'rgba(74,186,255,0.2)',
    desc: 'Almacenamiento descentralizado en Shadow Drive. Tus archivos, tu wallet, tu propiedad — sin servidores centralizados.',
    cta: 'Ver Vault →',
  },
  {
    id: 'spaces',
    label: 'Solvik Spaces',
    tag: 'Streaming',
    href: '/spaces',
    color: '#B06FFF',
    bg: 'rgba(176,111,255,0.07)',
    border: 'rgba(176,111,255,0.2)',
    desc: 'Canal de creador con suscripciones en USDC. Tu audiencia. Tus reglas. Sin algoritmos que te silencien.',
    cta: 'Ver Spaces →',
  },
]

export default function LandingPage() {
  const { t } = useTranslation()
  const [hasSession, setHasSession] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [heroBg, setHeroBg] = useState<string | null>(null)

  useEffect(() => {
    setHasSession(document.cookie.includes('session_active=1'))
    fetch('/api/admin/hero-bg').then(r => r.json()).then(d => setHeroBg(d.url ?? null)).catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {heroBg && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.18 }} />
      )}

      {/* Navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(123,47,255,0.12)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,0,21,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 30, objectFit: 'contain', borderRadius: 6 }} />
          <span style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 17, color: '#F0F0FF' }}>Solvik Studio</span>
        </div>
        <div className="nav-desktop">
          <a href="/pechat" style={{ color: 'rgba(240,240,255,0.65)', textDecoration: 'none', fontSize: 14 }}>Pečat</a>
          <a href="/torg"   style={{ color: 'rgba(240,240,255,0.65)', textDecoration: 'none', fontSize: 14 }}>Torg</a>
          <a href="/vault"  style={{ color: 'rgba(240,240,255,0.65)', textDecoration: 'none', fontSize: 14 }}>Vault</a>
          <a href="/spaces" style={{ color: 'rgba(240,240,255,0.65)', textDecoration: 'none', fontSize: 14 }}>Spaces</a>
          <a href="/terms"  style={{ color: 'rgba(240,240,255,0.65)', textDecoration: 'none', fontSize: 14 }}>{t.nav.terms}</a>
          <LanguageSwitcher />
          <WalletAuthButton />
        </div>
        <div className="mobile-menu">
          <button onClick={() => setMenuOpen(v => !v)} style={{ background: 'rgba(74,186,255,0.08)', border: '1px solid rgba(74,186,255,0.2)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#4ABAFF', display: 'flex', alignItems: 'center' }}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'rgba(5,10,40,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(74,186,255,0.15)', borderRadius: 12, padding: '8px 0', minWidth: 180, zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              {[['Pečat', '/pechat'], ['Torg', '/torg'], ['Vault', '/vault'], ['Spaces', '/spaces'], [t.nav.terms, '/terms']].map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 18px', color: 'rgba(240,240,255,0.7)', textDecoration: 'none', fontSize: 14, borderBottom: '1px solid rgba(74,186,255,0.08)' }}>{label}</a>
              ))}
              <div style={{ padding: '10px 18px' }}><LanguageSwitcher /></div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="hero-section" style={{ textAlign: 'center', padding: '100px 40px 80px', maxWidth: 800, margin: '0 auto' }}>
        <HeroTitle text={t.landing.hero_title} className="hero-title" style={{ marginBottom: 28 }} />
        <p style={{ fontSize: 20, color: 'rgba(0,212,255,0.75)', fontFamily: 'var(--font-outfit), Outfit, Luna, sans-serif', lineHeight: 1.7, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
          {t.landing.hero_sub}
        </p>
        <div id="hero-connect">
          <WalletAuthButton showWidget />
        </div>
        {hasSession && (
          <a href="/dashboard" className="btn-secondary" style={{ display: 'inline-block', marginTop: 16, fontSize: 14 }}>
            {t.common.dashboard} →
          </a>
        )}
      </div>

      {/* Products */}
      <div style={{ maxWidth: 1000, margin: '0 auto 80px', padding: '0 clamp(16px,5vw,40px)' }}>
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(180,210,255,0.3)', marginBottom: 32, fontFamily: 'Luna, sans-serif' }}>
          Ecosistema Solvik Studio
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {PRODUCTS.map(p => (
            <a key={p.id} href={p.href} style={{ textDecoration: 'none', display: 'block', background: p.bg, border: `1px solid ${p.border}`, borderRadius: 16, padding: '26px 24px 28px', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${p.color}22` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
            >
              <div style={{ display: 'inline-block', background: `${p.color}18`, border: `1px solid ${p.color}40`, borderRadius: 50, padding: '2px 12px', marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: p.color, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Luna, sans-serif' }}>{p.tag}</span>
              </div>
              <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 19, color: '#F0F0FF', marginBottom: 10 }}>{p.label}</p>
              <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.6)', lineHeight: 1.65, fontFamily: 'Luna, sans-serif', marginBottom: 18 }}>{p.desc}</p>
              <span style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: 'Luna, sans-serif' }}>{p.cta}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Pain cards */}
      <div className="pain-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, maxWidth: 900, margin: '0 auto 80px', padding: '0 clamp(16px, 5vw, 40px)' }}>
        {[
          { icon: '⚠️', title: t.landing.feat1_title, desc: t.landing.feat1_desc },
          { icon: '🛡️', title: t.landing.feat2_title, desc: t.landing.feat2_desc },
          { icon: '⏱️', title: t.landing.feat3_title, desc: t.landing.feat3_desc },
        ].map(f => (
          <div key={f.title} className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
            <h3 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 17, color: '#F0F0FF', marginBottom: 10 }}>{f.title}</h3>
            <p style={{ fontSize: 14, color: 'rgba(240,240,255,0.6)', fontFamily: 'Luna, sans-serif', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Solution */}
      <div style={{ maxWidth: 700, margin: '0 auto 80px', padding: '0 clamp(16px, 5vw, 40px)', textAlign: 'center' }}>
        <div style={{ borderLeft: '3px solid #7B2FFF', borderRight: '3px solid #00D4FF', background: 'linear-gradient(135deg, rgba(123,47,255,0.10) 0%, rgba(0,212,255,0.06) 100%)', borderRadius: 16, padding: 'clamp(20px,5vw,32px) clamp(16px,5vw,40px)' }}>
          <p style={{ fontWeight: 800, fontSize: 22, color: '#F0F0FF', marginBottom: 12 }}>{t.landing.solution_title}</p>
          <p style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 20, background: 'linear-gradient(90deg, #B06FFF, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 600 }}>
            {t.landing.solution_body}
          </p>
          <p style={{ fontSize: 14, color: 'rgba(0,212,255,0.55)', fontStyle: 'italic' }}>{t.landing.urgency}</p>
        </div>
      </div>

      {/* Trust */}
      <div style={{ maxWidth: 900, margin: '0 auto 80px', padding: '0 clamp(16px, 5vw, 40px)' }}>
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(180,210,255,0.35)', marginBottom: 32 }}>
          {t.landing.trust_title}
        </p>
        <div className="pain-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {[
            { icon: <ShieldCheck size={22} color="#00FFB3" />, color: '#00FFB3', title: t.landing.trust_altcha_title, desc: t.landing.trust_altcha_desc },
            { icon: <KeyRound size={22} color="#4ABAFF" />, color: '#4ABAFF', title: t.landing.trust_wallet_title, desc: t.landing.trust_wallet_desc },
            { icon: <Globe size={22} color="#B06FFF" />, color: '#B06FFF', title: t.landing.trust_storage_title, desc: t.landing.trust_storage_desc },
            { icon: <Zap size={22} color="#FFD700" />, color: '#FFD700', title: t.landing.trust_payments_title, desc: t.landing.trust_payments_desc },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '20px 20px 22px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${item.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#F0F8FF', lineHeight: 1.3 }}>{item.title}</p>
              <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.5)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ maxWidth: 720, margin: '0 auto 60px', padding: '0 clamp(16px, 5vw, 40px)' }}>
        <div style={{ border: '1px solid rgba(255,215,0,0.4)', background: 'rgba(255,215,0,0.05)', borderRadius: 16, padding: '16px 24px' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,215,0,0.8)', fontFamily: 'Luna, sans-serif', lineHeight: 1.7 }}>
            ⚠️ {t.landing.disclaimer_card}
          </p>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid rgba(123,47,255,0.1)', padding: '32px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(240,240,255,0.3)', fontFamily: 'Luna, sans-serif' }}>{t.nav.disclaimer}</p>
        <p style={{ fontSize: 12, color: 'rgba(240,240,255,0.2)', marginTop: 8, fontFamily: 'Luna, sans-serif' }}>
          © 2025 Solvik Studio · <a href="/terms" style={{ color: 'rgba(240,240,255,0.3)', textDecoration: 'none' }}>{t.nav.terms}</a>
        </p>
      </footer>
    </div>
  )
}
