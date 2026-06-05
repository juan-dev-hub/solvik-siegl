'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/components/LanguageProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { WalletAuthButton } from '@/components/WalletAuthButton'
import { CheckCircle, Shield, FileText, Layers, Users, Menu, X, Zap } from 'lucide-react'

const PLANS = [
  { id: 'verk',  price: 9.50,  color: '#4ABAFF' },
  { id: 'varde', price: 39.45, color: '#7B2FFF', popular: true },
  { id: 'kraft', price: 99.25, color: '#00D4AA' },
]

export default function PechatPage() {
  const { t } = useTranslation()
  const [hasSession, setHasSession] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setHasSession(document.cookie.includes('session_active=1'))
  }, [])

  const features = [
    { icon: <FileText size={22} color="#4ABAFF" />, title: 'Certificado con QR verificable', desc: 'Cada documento emitido incluye un QR único que cualquier persona puede escanear para validar la autenticidad al instante.' },
    { icon: <Shield size={22} color="#7B2FFF" />, title: 'Sellado en Solana', desc: 'El registro queda inmutable en blockchain. Nadie puede alterarlo, borrarlo ni negarlo — ni el emisor, ni nosotros.' },
    { icon: <Layers size={22} color="#00D4AA" />, title: 'cNFT por documento', desc: 'Cada certificado es un NFT comprimido (compressed NFT) vinculado a la wallet del emisor. Costo mínimo, escala máxima.' },
    { icon: <Users size={22} color="#FFD700" />, title: 'Emisión individual o masiva', desc: 'Emitís un certificado o cargás una carpeta completa con decenas de archivos. El sistema procesa todo en paralelo.' },
    { icon: <Zap size={22} color="#FF9F0A" />, title: 'Helpers autorizados', desc: 'Delegá la emisión a wallets colaboradoras sin entregar acceso total a tu cuenta. Control granular, flujo de trabajo eficiente.' },
  ]

  const PLAN_FEATURES: Record<string, string[]> = {
    verk: [
      'Obras digitales con licencia verificable',
      'Tienda pública de productos',
      'Galería de creador',
      'NFT comprimido por obra',
    ],
    varde: [
      'Todo lo de VERK incluido',
      'Certificados académicos y corporativos',
      'Emisión por lote (carpetas)',
      'Hasta 5 wallets helpers',
      'SNS verificado (.sol)',
      'Widget embebible',
      'Página pública de institución',
    ],
    kraft: [
      'Todo lo de VARDE incluido',
      'Hasta 15 wallets helpers',
      'Mayor capacidad de almacenamiento',
      'Soporte prioritario',
      'Bucket Shadow Drive propio',
    ],
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(123,47,255,0.12)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,0,21,0.7)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 28, objectFit: 'contain', borderRadius: 4 }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: '#F0F8FF', fontFamily: 'Luna, sans-serif' }}>Solvik Studio</span>
        </a>
        <div style={{ display: 'none', alignItems: 'center', gap: 20 }} className="nav-desktop">
          <a href="/pechat" style={{ color: '#7B2FFF', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Pečat</a>
          <a href="/torg"   style={{ color: 'rgba(240,240,255,0.55)', textDecoration: 'none', fontSize: 14 }}>Torg</a>
          <a href="/vault"  style={{ color: 'rgba(240,240,255,0.55)', textDecoration: 'none', fontSize: 14 }}>Vault</a>
          <a href="/spaces" style={{ color: 'rgba(240,240,255,0.55)', textDecoration: 'none', fontSize: 14 }}>Spaces</a>
          <a href="/terms"  style={{ color: 'rgba(240,240,255,0.55)', textDecoration: 'none', fontSize: 14 }}>Términos</a>
          <LanguageSwitcher />
          <WalletAuthButton />
        </div>
        <div className="mobile-menu">
          <button onClick={() => setMenuOpen(v => !v)} style={{ background: 'rgba(74,186,255,0.08)', border: '1px solid rgba(74,186,255,0.2)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#4ABAFF', display: 'flex', alignItems: 'center' }}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'rgba(5,10,40,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(74,186,255,0.15)', borderRadius: 12, padding: '8px 0', minWidth: 180, zIndex: 200 }}>
              {[['Pečat', '/pechat'], ['Torg', '/torg'], ['Vault', '/vault'], ['Spaces', '/spaces'], ['Términos', '/terms']].map(([label, href]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 18px', color: 'rgba(240,240,255,0.7)', textDecoration: 'none', fontSize: 14, borderBottom: '1px solid rgba(74,186,255,0.08)' }}>{label}</a>
              ))}
              <div style={{ padding: '10px 18px' }}><LanguageSwitcher /></div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '80px 40px 64px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: 'rgba(123,47,255,0.12)', border: '1px solid rgba(123,47,255,0.35)', borderRadius: 50, padding: '4px 18px', marginBottom: 24 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#7B2FFF', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Luna, sans-serif' }}>Solvik Pečat</span>
        </div>
        <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 'clamp(36px, 6vw, 58px)', color: '#F0F0FF', lineHeight: 1.15, marginBottom: 20 }}>
          Certificación documental<br />
          <span style={{ background: 'linear-gradient(90deg, #7B2FFF, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            verificable en blockchain
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(180,210,255,0.65)', fontFamily: 'Luna, sans-serif', lineHeight: 1.7, marginBottom: 36, maxWidth: 540, margin: '0 auto 36px' }}>
          Diplomas, contratos, licencias, obras digitales. Emití una vez y cualquier persona puede verificarlos al instante — en cualquier parte del mundo, para siempre.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          {hasSession ? (
            <a href="/pricing" className="btn-primary" style={{ fontSize: 15, padding: '13px 32px' }}>Ver planes →</a>
          ) : (
            <WalletAuthButton showWidget />
          )}
          <a href="/store" className="btn-secondary" style={{ fontSize: 15, padding: '13px 32px' }}>Ver galería pública</a>
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 900, margin: '0 auto 80px', padding: '0 clamp(16px, 5vw, 40px)' }}>
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(180,210,255,0.35)', marginBottom: 32, fontFamily: 'Luna, sans-serif' }}>
          Qué incluye Pečat
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 22px 24px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(123,47,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                {f.icon}
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#F0F0FF', marginBottom: 8, fontFamily: 'Luna, sans-serif' }}>{f.title}</p>
              <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.55)', lineHeight: 1.65, fontFamily: 'Luna, sans-serif' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{ maxWidth: 960, margin: '0 auto 80px', padding: '0 clamp(16px, 5vw, 40px)' }}>
        <h2 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 32, color: '#F0F0FF', textAlign: 'center', marginBottom: 8 }}>
          Planes Pečat
        </h2>
        <p style={{ textAlign: 'center', color: 'rgba(240,240,255,0.5)', fontSize: 15, fontFamily: 'Luna, sans-serif', marginBottom: 40 }}>
          {t.pricing.sub}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 28 }}>
          {PLANS.map(p => (
            <div key={p.id} className="glass-card" style={{ border: p.popular ? `1px solid ${p.color}` : undefined, position: 'relative' }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #7B2FFF, #00D4FF)', color: '#fff', borderRadius: 50, padding: '3px 18px', fontSize: 11, fontWeight: 700, fontFamily: 'Luna, sans-serif', whiteSpace: 'nowrap' }}>
                  {t.landing.most_popular}
                </div>
              )}
              <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 22, color: p.color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{p.id}</p>
              <p style={{ fontSize: 40, fontFamily: 'Luna, sans-serif', fontWeight: 800, color: '#F0F0FF', lineHeight: 1 }}>
                ${p.price}<span style={{ fontSize: 16, color: 'rgba(240,240,255,0.5)', fontWeight: 400 }}>{t.landing.per_month}</span>
              </p>
              <div style={{ margin: '20px 0 24px' }}>
                {PLAN_FEATURES[p.id]?.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <CheckCircle size={13} color="#00FFB3" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'rgba(240,240,255,0.7)', fontFamily: 'Luna, sans-serif' }}>{f}</span>
                  </div>
                ))}
              </div>
              {hasSession ? (
                <a href="/pricing" className="btn-primary" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                  Comenzar — ${p.price}/mes
                </a>
              ) : (
                <a href="/" className="btn-primary" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                  {t.common.connect}
                </a>
              )}
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(123,47,255,0.06)', border: '1px solid rgba(123,47,255,0.15)', borderRadius: 16, padding: '20px 28px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'rgba(240,240,255,0.5)', fontFamily: 'Luna, sans-serif', lineHeight: 1.7 }}>
            {t.landing.disclaimer_card}
          </p>
        </div>
      </div>

      <footer style={{ borderTop: '1px solid rgba(123,47,255,0.1)', padding: '28px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(240,240,255,0.2)', fontFamily: 'Luna, sans-serif' }}>
          © 2025 Solvik Studio · <a href="/terms" style={{ color: 'rgba(240,240,255,0.3)', textDecoration: 'none' }}>{t.nav.terms}</a>
        </p>
      </footer>
    </div>
  )
}
