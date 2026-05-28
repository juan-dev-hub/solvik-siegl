'use client'
import { useTranslation } from '@/components/LanguageProvider'
import { WalletAuthButton } from '@/components/WalletAuthButton'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Shield, AlertTriangle, Clock, ShieldCheck, KeyRound, Globe, Zap } from 'lucide-react'
import { HeroTitle } from '@/components/HeroTitle'

const PLANS = [
  { id: 'starter', price: 49,  storage: '1 GB',  bytes: 1_073_741_824  },
  { id: 'pro',     price: 99,  storage: '5 GB',  bytes: 5_368_709_120,  popular: true },
  { id: 'studio',  price: 249, storage: '20 GB', bytes: 21_474_836_480 },
]

export default function LandingPage() {
  const { t } = useTranslation()

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(123,47,255,0.12)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,0,21,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 32, objectFit: 'contain', borderRadius: 6 }} />
          <span style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 18, color: '#F0F0FF' }}>Solvik Studio</span>
        </div>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="/pricing" style={{ color: 'rgba(240,240,255,0.65)', textDecoration: 'none', fontSize: 14 }}>{t.nav.pricing}</a>
          <a href="/terms" style={{ color: 'rgba(240,240,255,0.65)', textDecoration: 'none', fontSize: 14 }}>{t.nav.terms}</a>
          <LanguageSwitcher />
          <WalletAuthButton />
        </div>
      </nav>

      {/* Hero */}
      <div className="hero-section" style={{ textAlign: 'center', padding: '100px 40px 80px', maxWidth: 800, margin: '0 auto' }}>
        <HeroTitle
          text={t.landing.hero_title}
          className="hero-title"
          style={{ marginBottom: 28 }}
        />
        <p style={{ fontSize: 20, color: 'rgba(0,212,255,0.75)', fontFamily: 'var(--font-outfit), Outfit, Luna, sans-serif', lineHeight: 1.7, marginBottom: 40, maxWidth: 600, margin: '0 auto 40px' }}>
          {t.landing.hero_sub}
        </p>
        <WalletAuthButton />
      </div>

      {/* Disclaimer card */}
      <div style={{ maxWidth: 720, margin: '0 auto 60px', padding: '0 40px' }}>
        <div style={{ border: '1px solid rgba(255,215,0,0.4)', background: 'rgba(255,215,0,0.05)', borderRadius: 16, padding: '16px 24px' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,215,0,0.8)', fontFamily: 'Luna, sans-serif', lineHeight: 1.7 }}>
            ⚠️ {t.landing.disclaimer_card}
          </p>
        </div>
      </div>

      {/* Pain cards */}
      <div className="pain-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 900, margin: '0 auto 80px', padding: '0 40px' }}>
        {[
          { icon: <AlertTriangle size={28} color="#FF6B6B" />, title: t.landing.feat1_title, desc: t.landing.feat1_desc },
          { icon: <Shield size={28} color="#B06FFF" />, title: t.landing.feat2_title, desc: t.landing.feat2_desc },
          { icon: <Clock size={28} color="#FFD700" />, title: t.landing.feat3_title, desc: t.landing.feat3_desc },
        ].map(f => (
          <div key={f.title} className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>{f.icon}</div>
            <h3 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 17, color: '#F0F0FF', marginBottom: 10 }}>{f.title}</h3>
            <p style={{ fontSize: 14, color: 'rgba(240,240,255,0.6)', fontFamily: 'Luna, sans-serif', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Solution block */}
      <div style={{ maxWidth: 700, margin: '0 auto 80px', padding: '0 40px', textAlign: 'center' }}>
        <div style={{ borderLeft: '3px solid #7B2FFF', borderRight: '3px solid #00D4FF', background: 'linear-gradient(135deg, rgba(123,47,255,0.10) 0%, rgba(0,212,255,0.06) 100%)', borderRadius: 16, padding: '32px 40px' }}>
          <p style={{ fontWeight: 800, fontSize: 22, color: '#F0F0FF', marginBottom: 12 }}>
            {t.landing.solution_title}
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.6, marginBottom: 20, background: 'linear-gradient(90deg, #B06FFF, #00D4FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 600 }}>
            {t.landing.solution_body}
          </p>
          <p style={{ fontSize: 14, color: 'rgba(0,212,255,0.55)', fontStyle: 'italic' }}>
            {t.landing.urgency}
          </p>
        </div>
      </div>

      {/* Trust / Security section */}
      <div style={{ maxWidth: 900, margin: '0 auto 80px', padding: '0 40px' }}>
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(180,210,255,0.35)', marginBottom: 32 }}>
          {t.landing.trust_title}
        </p>
        <div className="pain-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {[
            {
              icon: <ShieldCheck size={22} color="#00FFB3" />,
              color: '#00FFB3',
              title: t.landing.trust_altcha_title,
              desc: t.landing.trust_altcha_desc,
            },
            {
              icon: <KeyRound size={22} color="#4ABAFF" />,
              color: '#4ABAFF',
              title: t.landing.trust_wallet_title,
              desc: t.landing.trust_wallet_desc,
            },
            {
              icon: <Globe size={22} color="#B06FFF" />,
              color: '#B06FFF',
              title: t.landing.trust_arweave_title,
              desc: t.landing.trust_arweave_desc,
            },
            {
              icon: <Zap size={22} color="#FFD700" />,
              color: '#FFD700',
              title: t.landing.trust_payments_title,
              desc: t.landing.trust_payments_desc,
            },
          ].map(item => (
            <div key={item.title} style={{
              display: 'flex', flexDirection: 'column', gap: 10,
              padding: '20px 20px 22px',
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14,
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${item.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </div>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#F0F8FF', lineHeight: 1.3 }}>{item.title}</p>
              <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.5)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{ maxWidth: 960, margin: '0 auto 80px', padding: '0 40px' }}>
        <h2 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 32, color: '#F0F0FF', textAlign: 'center', marginBottom: 8 }}>
          {t.pricing.title}
        </h2>
        <p style={{ textAlign: 'center', color: 'rgba(240,240,255,0.5)', fontSize: 15, fontFamily: 'Luna, sans-serif', marginBottom: 40 }}>
          {t.landing.pricing_sub}
        </p>
        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
          {PLANS.map(p => (
            <div key={p.id} className="glass-card" style={{ border: p.popular ? '1px solid #7B2FFF' : undefined, position: 'relative' }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #7B2FFF, #00D4FF)', color: '#fff', borderRadius: 50, padding: '2px 16px', fontSize: 11, fontWeight: 700, fontFamily: 'Luna, sans-serif', whiteSpace: 'nowrap' }}>
                  {t.landing.most_popular}
                </div>
              )}
              <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 20, color: '#F0F0FF', textTransform: 'capitalize', marginBottom: 8 }}>{p.id}</p>
              <p style={{ fontSize: 36, fontFamily: 'Luna, sans-serif', fontWeight: 800, color: '#7B2FFF', marginBottom: 4 }}>
                ${p.price}<span style={{ fontSize: 16, color: 'rgba(240,240,255,0.5)' }}>{t.landing.per_month}</span>
              </p>
              <p style={{ fontSize: 14, color: '#00D4FF', fontFamily: 'Luna, sans-serif', marginBottom: 24, fontWeight: 600 }}>
                {p.storage} {t.landing.credits}
              </p>
              <a href="/" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {t.landing.get_plan} ${p.price}/mes
              </a>
            </div>
          ))}
        </div>

      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(123,47,255,0.1)', padding: '32px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(240,240,255,0.3)', fontFamily: 'Luna, sans-serif' }}>
          {t.nav.disclaimer}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(240,240,255,0.2)', marginTop: 8, fontFamily: 'Luna, sans-serif' }}>
          © 2025 Solvik Studio · <a href="/terms" style={{ color: 'rgba(240,240,255,0.3)', textDecoration: 'none' }}>{t.nav.terms}</a>
        </p>
      </footer>
    </div>
  )
}
