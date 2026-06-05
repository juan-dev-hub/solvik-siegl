'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/components/LanguageProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { WalletAuthButton } from '@/components/WalletAuthButton'
import { Tv, Users, Lock, Zap, DollarSign, Menu, X } from 'lucide-react'

export default function SpacesPage() {
  const { t } = useTranslation()
  const [hasSession, setHasSession] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setHasSession(document.cookie.includes('session_active=1'))
  }, [])

  const features = [
    { icon: <Tv size={22} color="#B06FFF" />, title: 'Canal de creador propio', desc: 'Tu espacio en Solvik Spaces. Publicás contenido exclusivo para tus suscriptores: videos, audios, documentos, publicaciones.' },
    { icon: <DollarSign size={22} color="#FFD700" />, title: 'Suscripciones en USDC', desc: 'Tus seguidores pagan mensualmente en USDC para acceder a tu contenido. Vos definís el precio. El pago llega directo a tu wallet.' },
    { icon: <Lock size={22} color="#4ABAFF" />, title: 'Contenido por niveles', desc: 'Diferenciá contenido público y exclusivo. Tus suscriptores ven lo que merecen ver según su nivel de suscripción.' },
    { icon: <Users size={22} color="#00FFB3" />, title: 'Comunidad soberana', desc: 'Sin algoritmos que te silencien. Sin plataformas que te desmonetizen. Tu audiencia es tuya, y el canal lo controlás vos.' },
    { icon: <Zap size={22} color="#FF9F0A" />, title: 'Renovación automática', desc: 'Las suscripciones se renuevan automáticamente. Sin fricción para el suscriptor. Ingresos predecibles para vos.' },
  ]

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(123,47,255,0.12)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,0,21,0.7)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 28, objectFit: 'contain', borderRadius: 4 }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: '#F0F8FF', fontFamily: 'Luna, sans-serif' }}>Solvik Studio</span>
        </a>
        <div style={{ display: 'none', alignItems: 'center', gap: 20 }} className="nav-desktop">
          <a href="/pechat" style={{ color: 'rgba(240,240,255,0.55)', textDecoration: 'none', fontSize: 14 }}>Pečat</a>
          <a href="/torg"   style={{ color: 'rgba(240,240,255,0.55)', textDecoration: 'none', fontSize: 14 }}>Torg</a>
          <a href="/vault"  style={{ color: 'rgba(240,240,255,0.55)', textDecoration: 'none', fontSize: 14 }}>Vault</a>
          <a href="/spaces" style={{ color: '#B06FFF', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Spaces</a>
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
        <div style={{ display: 'inline-block', background: 'rgba(176,111,255,0.1)', border: '1px solid rgba(176,111,255,0.35)', borderRadius: 50, padding: '4px 18px', marginBottom: 24 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#B06FFF', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Luna, sans-serif' }}>Solvik Spaces</span>
        </div>
        <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 'clamp(36px, 6vw, 58px)', color: '#F0F0FF', lineHeight: 1.15, marginBottom: 20 }}>
          Streaming y membresías<br />
          <span style={{ background: 'linear-gradient(90deg, #B06FFF, #FF9F0A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            sobre Solana
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(180,210,255,0.65)', fontFamily: 'Luna, sans-serif', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 36px' }}>
          Tu canal. Tu audiencia. Tus reglas. Monetizá con suscripciones en USDC sin intermediarios que te silencien ni te desmonetizen.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          {hasSession ? (
            <a href="/dashboard/creator" className="btn-primary" style={{ fontSize: 15, padding: '13px 32px', background: 'linear-gradient(180deg, rgba(176,111,255,0.9), rgba(120,60,200,1))' }}>
              Crear mi canal →
            </a>
          ) : (
            <WalletAuthButton showWidget />
          )}
          <a href="/pechat" className="btn-secondary" style={{ fontSize: 15, padding: '13px 32px' }}>
            Ver planes →
          </a>
        </div>
      </div>

      {/* Comparison */}
      <div style={{ maxWidth: 720, margin: '0 auto 64px', padding: '0 clamp(16px,5vw,40px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { label: 'Patreon / YouTube', items: ['Comisiones del 5–30%', 'Algoritmo decide tu alcance', 'Pueden suspenderte sin aviso', 'Pagos en 30–60 días', 'La plataforma controla tu audiencia'] },
            { label: 'Solvik Spaces', items: ['Sin comisión de plataforma sobre contenido', 'Tu canal es tuyo', 'Sin censura algorítmica', 'Pago en el mismo bloque', 'Tu audiencia te sigue con su wallet'], highlight: true },
          ].map(col => (
            <div key={col.label} style={{ background: col.highlight ? 'rgba(176,111,255,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${col.highlight ? 'rgba(176,111,255,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 14, padding: '20px 22px' }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: col.highlight ? '#B06FFF' : 'rgba(240,240,255,0.4)', marginBottom: 16, fontFamily: 'Luna, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col.label}</p>
              {col.items.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ color: col.highlight ? '#00FFB3' : 'rgba(255,100,100,0.5)', fontSize: 13, flexShrink: 0 }}>{col.highlight ? '✓' : '✗'}</span>
                  <span style={{ fontSize: 13, color: col.highlight ? 'rgba(240,240,255,0.75)' : 'rgba(240,240,255,0.35)', fontFamily: 'Luna, sans-serif' }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 900, margin: '0 auto 80px', padding: '0 clamp(16px,5vw,40px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 22px 24px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(176,111,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                {f.icon}
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#F0F0FF', marginBottom: 8, fontFamily: 'Luna, sans-serif' }}>{f.title}</p>
              <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.55)', lineHeight: 1.65, fontFamily: 'Luna, sans-serif' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(176,111,255,0.04)', border: '1px solid rgba(176,111,255,0.12)', padding: '40px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 22, color: '#F0F0FF', marginBottom: 12 }}>
          Spaces está disponible con cualquier plan Pečat
        </p>
        <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.5)', marginBottom: 24, fontFamily: 'Luna, sans-serif' }}>
          Activá VERK, VARDE o KRAFT y empezá a construir tu canal desde el dashboard.
        </p>
        <a href="/pechat" className="btn-primary" style={{ fontSize: 15, padding: '13px 32px', background: 'linear-gradient(180deg, rgba(176,111,255,0.9), rgba(120,60,200,1))' }}>
          Ver planes →
        </a>
      </div>

      <footer style={{ borderTop: '1px solid rgba(123,47,255,0.1)', padding: '28px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(240,240,255,0.2)', fontFamily: 'Luna, sans-serif' }}>
          © 2025 Solvik Studio · <a href="/terms" style={{ color: 'rgba(240,240,255,0.3)', textDecoration: 'none' }}>{t.nav.terms}</a>
        </p>
      </footer>
    </div>
  )
}
