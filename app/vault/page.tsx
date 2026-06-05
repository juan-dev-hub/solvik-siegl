'use client'
import { useState, useEffect } from 'react'
import { useTranslation } from '@/components/LanguageProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { WalletAuthButton } from '@/components/WalletAuthButton'
import { HardDrive, Shield, Key, Globe, Lock, Menu, X } from 'lucide-react'

export default function VaultMarketingPage() {
  const { t } = useTranslation()
  const [hasSession, setHasSession] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setHasSession(document.cookie.includes('session_active=1'))
  }, [])

  const features = [
    { icon: <HardDrive size={22} color="#4ABAFF" />, title: 'Shadow Drive — Solana', desc: 'Tus archivos se almacenan en Shadow Drive, la red de almacenamiento descentralizado nativa de Solana. Sin servidores centralizados.' },
    { icon: <Key size={22} color="#FFD700" />, title: 'Control mediante tu wallet', desc: 'Sólo la wallet que activó el vault puede acceder, subir o eliminar archivos. Sin contraseñas. Sin cuentas de terceros.' },
    { icon: <Shield size={22} color="#00FFB3" />, title: 'Propiedad soberana', desc: 'Tus datos son tuyos. El bucket de almacenamiento está vinculado a tu identidad en Solana, no a nuestra plataforma.' },
    { icon: <Lock size={22} color="#7B2FFF" />, title: 'Acceso privado', desc: 'Los archivos en tu vault son privados por defecto. Sólo vos podés ver y acceder a ellos desde el dashboard.' },
    { icon: <Globe size={22} color="#FF9F0A" />, title: 'Infraestructura soberana', desc: 'Sin Google Drive. Sin Dropbox. Sin términos de servicio que te digan qué podés guardar y qué no. Tu almacenamiento. Tus reglas.' },
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
          <a href="/vault"  style={{ color: '#4ABAFF', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Vault</a>
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

      <div style={{ textAlign: 'center', padding: '80px 40px 64px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: 'rgba(74,186,255,0.1)', border: '1px solid rgba(74,186,255,0.35)', borderRadius: 50, padding: '4px 18px', marginBottom: 24 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4ABAFF', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Luna, sans-serif' }}>Solvik Vault</span>
        </div>
        <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 'clamp(36px, 6vw, 58px)', color: '#F0F0FF', lineHeight: 1.15, marginBottom: 20 }}>
          Almacenamiento<br />
          <span style={{ background: 'linear-gradient(90deg, #4ABAFF, #00FFB3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            descentralizado
          </span>
        </h1>
        <p style={{ fontSize: 18, color: 'rgba(180,210,255,0.65)', fontFamily: 'Luna, sans-serif', lineHeight: 1.7, maxWidth: 520, margin: '0 auto 36px' }}>
          Tus archivos. Tu wallet. Tu control total. Sin servidores centralizados, sin términos arbitrarios, sin terceros que decidan qué podés guardar.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          {hasSession ? (
            <a href="/dashboard/vault" className="btn-primary" style={{ fontSize: 15, padding: '13px 32px', background: 'linear-gradient(180deg, rgba(74,186,255,0.9), rgba(0,120,200,1))' }}>
              Ir a mi Vault →
            </a>
          ) : (
            <WalletAuthButton showWidget />
          )}
          <a href="/pechat" className="btn-secondary" style={{ fontSize: 15, padding: '13px 32px' }}>Ver planes →</a>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto 64px', padding: '0 clamp(16px,5vw,40px)' }}>
        <div style={{ background: 'rgba(74,186,255,0.05)', border: '1px solid rgba(74,186,255,0.18)', borderRadius: 16, padding: '28px 32px' }}>
          <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 16, color: '#F0F0FF', marginBottom: 12 }}>No es Google Drive. No es Dropbox.</p>
          <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.6)', lineHeight: 1.7, fontFamily: 'Luna, sans-serif' }}>
            Vault es almacenamiento descentralizado donde la propiedad es tuya — no de nuestra plataforma, no de ningún servidor.
            Los archivos viven en Shadow Drive, la red de almacenamiento de Solana.
            Si mañana Solvik Studio desapareciera, tus archivos seguirían siendo accesibles desde tu wallet.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto 80px', padding: '0 clamp(16px,5vw,40px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {features.map(f => (
            <div key={f.title} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '22px 22px 24px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(74,186,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>{f.icon}</div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#F0F0FF', marginBottom: 8, fontFamily: 'Luna, sans-serif' }}>{f.title}</p>
              <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.55)', lineHeight: 1.65, fontFamily: 'Luna, sans-serif' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(74,186,255,0.04)', border: '1px solid rgba(74,186,255,0.12)', padding: '40px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 22, color: '#F0F0FF', marginBottom: 12 }}>Vault incluido con todos los planes Pečat</p>
        <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.5)', marginBottom: 24, fontFamily: 'Luna, sans-serif' }}>No es un producto separado — viene integrado con tu suscripción a Pečat.</p>
        <a href="/pechat" className="btn-primary" style={{ fontSize: 15, padding: '13px 32px', background: 'linear-gradient(180deg, rgba(74,186,255,0.9), rgba(0,120,200,1))' }}>Ver planes →</a>
      </div>

      <footer style={{ borderTop: '1px solid rgba(123,47,255,0.1)', padding: '28px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(240,240,255,0.2)', fontFamily: 'Luna, sans-serif' }}>
          © 2025 Solvik Studio · <a href="/terms" style={{ color: 'rgba(240,240,255,0.3)', textDecoration: 'none' }}>{t.nav.terms}</a>
        </p>
      </footer>
    </div>
  )
}
