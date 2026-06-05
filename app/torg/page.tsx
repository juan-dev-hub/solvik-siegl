'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/components/LanguageProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { WalletAuthButton } from '@/components/WalletAuthButton'
import { ShoppingBag, Zap, Lock, Globe, DollarSign, Menu, X } from 'lucide-react'

export default function TorgPage() {
  const { t } = useTranslation()
  const [hasSession, setHasSession] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setHasSession(document.cookie.includes('session_active=1'))
  }, [])

  const features = [
    { icon: <ShoppingBag size={22} color="#00D4AA" />, title: 'Cualquier formato digital', desc: 'eBooks, PDFs, ZIPs, cursos, plantillas, software, música. Si se puede descargar, se puede vender en Torg.' },
    { icon: <DollarSign size={22} color="#FFD700" />, title: '70% directo al creador', desc: 'De cada venta, el 70% llega a tu wallet al instante. Sin esperas de 30 días, sin mínimos de retiro, sin bancos.' },
    { icon: <Lock size={22} color="#4ABAFF" />, title: 'Licencia verificable', desc: 'Cada compra genera una licencia registrada en blockchain. El comprador puede probar que pagó. Tú podés probar que vendiste.' },
    { icon: <Zap size={22} color="#7B2FFF" />, title: 'Entrega instantánea', desc: 'En el momento en que el pago se confirma en Solana, el comprador recibe acceso de descarga. Sin intervención manual.' },
    { icon: <Globe size={22} color="#FF9F0A" />, title: 'Tienda pública', desc: 'Tu perfil de creador tiene una tienda pública que cualquier persona puede visitar, sin necesidad de cuenta ni wallet.' },
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
          <a href="/torg"   style={{ color: '#00D4AA', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Torg</a>
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
        <div style={{ display: 'inline-block', background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.35)', borderRadius: 50, padding: '4px 18px', marginBottom: 24 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#00D4AA', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Luna, sans-serif' }}>Solvik Torg</span>
        </div>
        <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 'clamp(36px, 6vw, 58px)', color: '#F0F0FF', lineHeight: 1.15, marginBottom: 20 }}>
          Mercado digital<br />
          <span style={{ background: 'linear-gradient(90deg, #00D4AA, #FFD700)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            sin intermediarios
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(180,210,255,0.65)', fontFamily: 'Luna, sans-serif', lineHeight: 1.7, maxWidth: 540, margin: '0 auto 36px' }}>
          Vendé activos digitales directamente a tu audiencia. El dinero llega a tu wallet al instante. Sin comisiones abusivas. Sin esperas.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/store" className="btn-primary" style={{ fontSize: 15, padding: '13px 32px', background: 'linear-gradient(180deg, rgba(0,212,170,0.9), rgba(0,160,130,1))' }}>
            Ver la tienda →
          </a>
          {hasSession ? (
            <a href="/dashboard/products" className="btn-secondary" style={{ fontSize: 15, padding: '13px 32px' }}>
              Publicar mis obras
            </a>
          ) : (
            <a href="/" className="btn-secondary" style={{ fontSize: 15, padding: '13px 32px' }}>
              {t.common.connect}
            </a>
          )}
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth: 760, margin: '0 auto 64px', padding: '0 clamp(16px,5vw,40px)' }}>
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(180,210,255,0.35)', marginBottom: 32, fontFamily: 'Luna, sans-serif' }}>
          Cómo funciona
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            { n: '01', title: 'Publicás tu obra', desc: 'Subís el archivo (PDF, ZIP, MP3, etc.) con portada WebP y precio en USDC.' },
            { n: '02', title: 'El comprador paga', desc: 'Escanea el QR con su wallet de Solana. El pago se confirma en segundos.' },
            { n: '03', title: 'Recibís el 70% al instante', desc: 'El dinero llega a tu wallet en el mismo bloque de la transacción.' },
            { n: '04', title: 'La licencia queda registrada', desc: 'El comprador obtiene una licencia on-chain. Tú obtenés un registro permanente de la venta.' },
          ].map((step, i) => (
            <div key={step.n} style={{ display: 'flex', gap: 24, padding: '24px 0', borderBottom: i < 3 ? '1px solid rgba(0,212,170,0.08)' : undefined }}>
              <span style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 28, color: 'rgba(0,212,170,0.2)', flexShrink: 0, width: 40 }}>{step.n}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#F0F0FF', marginBottom: 6, fontFamily: 'Luna, sans-serif' }}>{step.title}</p>
                <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.55)', lineHeight: 1.6, fontFamily: 'Luna, sans-serif' }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Split */}
      <div style={{ maxWidth: 560, margin: '0 auto 80px', padding: '0 clamp(16px,5vw,40px)' }}>
        <div style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 16, padding: '28px 32px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 18, color: '#F0F0FF', marginBottom: 20 }}>Distribución por venta</p>
          {[
            { label: 'Creador', pct: '70%', color: '#00D4AA' },
            { label: 'Gas (Solana ops)', pct: '15%', color: '#4ABAFF' },
            { label: 'Reserva contrato', pct: '10%', color: '#7B2FFF' },
            { label: 'Plataforma Solvik', pct: '5%', color: 'rgba(240,240,255,0.3)' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 14, color: 'rgba(240,240,255,0.6)', fontFamily: 'Luna, sans-serif' }}>{row.label}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: row.color, fontFamily: 'Luna, sans-serif' }}>{row.pct}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 900, margin: '0 auto 80px', padding: '0 clamp(16px,5vw,40px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 22px 24px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,212,170,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                {f.icon}
              </div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#F0F0FF', marginBottom: 8, fontFamily: 'Luna, sans-serif' }}>{f.title}</p>
              <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.55)', lineHeight: 1.65, fontFamily: 'Luna, sans-serif' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(0,212,170,0.04)', border: '1px solid rgba(0,212,170,0.12)', borderRadius: 0, padding: '40px', textAlign: 'center', marginBottom: 0 }}>
        <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 22, color: '#F0F0FF', marginBottom: 12 }}>
          Torg está incluido en todos los planes Pečat
        </p>
        <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.5)', marginBottom: 24, fontFamily: 'Luna, sans-serif' }}>
          Con VERK, VARDE o KRAFT tenés acceso a la tienda, galería pública y herramientas de creador.
        </p>
        <a href="/pechat" className="btn-primary" style={{ fontSize: 15, padding: '13px 32px', background: 'linear-gradient(180deg, rgba(0,212,170,0.9), rgba(0,160,130,1))' }}>
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
