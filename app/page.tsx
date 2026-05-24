'use client'
import { useTranslation } from '@/components/LanguageProvider'
import { WalletAuthButton } from '@/components/WalletAuthButton'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Shield, Zap, QrCode } from 'lucide-react'
import { HeroTitle } from '@/components/HeroTitle'

const PLANS = [
  { id: 'starter', price: 9,  credits: 15  },
  { id: 'pro',     price: 25, credits: 60,  popular: true },
  { id: 'studio',  price: 59, credits: 200 },
]

const EXTRA_PACKS = [
  { id: 'mini',   price: 5,  credits: 10  },
  { id: 'normal', price: 18, credits: 50  },
  { id: 'grande', price: 55, credits: 200 },
]

export default function LandingPage() {
  const { t } = useTranslation()

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(100,200,255,0.08)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,14,28,0.7)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 32, objectFit: 'contain', borderRadius: 6 }} />
          <span style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 18, color: '#F0F8FF' }}>Solvik Studio</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <p style={{ fontSize: 11, color: 'rgba(180,210,255,0.35)', maxWidth: 260, fontFamily: 'Luna, sans-serif', lineHeight: 1.4, display: 'none' }} className="disclaimer-nav">{t.nav.disclaimer}</p>
          <a href="/pricing" style={{ color: 'rgba(180,210,255,0.65)', textDecoration: 'none', fontSize: 14, fontFamily: 'Luna, sans-serif' }}>{t.nav.pricing}</a>
          <a href="/terms" style={{ color: 'rgba(180,210,255,0.65)', textDecoration: 'none', fontSize: 14, fontFamily: 'Luna, sans-serif' }}>{t.nav.terms}</a>
          <LanguageSwitcher />
          <WalletAuthButton />
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '100px 40px 80px', maxWidth: 760, margin: '0 auto' }}>
        <HeroTitle
          text={t.landing.hero_title}
          style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 56, color: '#F0F8FF', lineHeight: 1.1, marginBottom: 24 }}
        />
        <p style={{ fontSize: 20, color: 'rgba(180,210,255,0.65)', fontFamily: 'Luna, sans-serif', lineHeight: 1.6, marginBottom: 40 }}>
          {t.landing.hero_sub}
        </p>
        <WalletAuthButton />
      </div>

      {/* Disclaimer card */}
      <div style={{ maxWidth: 720, margin: '0 auto 60px', padding: '0 40px' }}>
        <div style={{ border: '1px solid rgba(255,229,102,0.4)', background: 'rgba(255,229,102,0.05)', borderRadius: 16, padding: '16px 24px' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,229,102,0.8)', fontFamily: 'Luna, sans-serif', lineHeight: 1.7 }}>
            ⚠️ {t.landing.disclaimer_card}
          </p>
        </div>
      </div>

      {/* Features */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 900, margin: '0 auto 80px', padding: '0 40px' }}>
        {[
          { icon: <Shield size={28} color="#4ABAFF" />, title: t.landing.feat1_title, desc: t.landing.feat1_desc },
          { icon: <Zap size={28} color="#00D4AA" />, title: t.landing.feat2_title, desc: t.landing.feat2_desc },
          { icon: <QrCode size={28} color="#52C878" />, title: t.landing.feat3_title, desc: t.landing.feat3_desc },
        ].map(f => (
          <div key={f.title} className="glass-card" style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 16 }}>{f.icon}</div>
            <h3 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 18, color: '#F0F8FF', marginBottom: 10 }}>{f.title}</h3>
            <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.6)', fontFamily: 'Luna, sans-serif', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div style={{ maxWidth: 900, margin: '0 auto 80px', padding: '0 40px' }}>
        <h2 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 32, color: '#F0F8FF', textAlign: 'center', marginBottom: 8 }}>
          {t.pricing.title}
        </h2>
        <p style={{ textAlign: 'center', color: 'rgba(180,210,255,0.5)', fontSize: 15, fontFamily: 'Luna, sans-serif', marginBottom: 40 }}>
          {t.landing.pricing_sub}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {PLANS.map(p => (
            <div key={p.id} className="glass-card" style={{ border: p.popular ? '1px solid #4ABAFF' : undefined, position: 'relative' }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#4ABAFF', color: '#fff', borderRadius: 50, padding: '2px 16px', fontSize: 11, fontWeight: 700, fontFamily: 'Luna, sans-serif', whiteSpace: 'nowrap' }}>
                  {t.landing.most_popular}
                </div>
              )}
              <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 20, color: '#F0F8FF', textTransform: 'capitalize', marginBottom: 8 }}>{p.id}</p>
              <p style={{ fontSize: 36, fontFamily: 'Luna, sans-serif', fontWeight: 800, color: '#4ABAFF', marginBottom: 4 }}>
                ${p.price}<span style={{ fontSize: 16, color: 'rgba(180,210,255,0.5)' }}>{t.landing.per_month}</span>
              </p>
              <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.6)', fontFamily: 'Luna, sans-serif', marginBottom: 24 }}>
                {p.credits} {t.landing.credits}
              </p>
              <a href="/" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {t.landing.get_plan} {p.id}
              </a>
            </div>
          ))}
        </div>

        {/* Extra credits */}
        <div style={{ marginTop: 40 }}>
          <h3 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 20, color: '#F0F8FF', marginBottom: 20, textAlign: 'center' }}>
            {t.landing.extra_credits}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {EXTRA_PACKS.map(pk => (
              <div key={pk.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px' }}>
                <div>
                  <p style={{ color: '#F0F8FF', fontWeight: 600, fontFamily: 'Luna, sans-serif', textTransform: 'capitalize' }}>{pk.id}</p>
                  <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.5)', fontFamily: 'Luna, sans-serif' }}>{pk.credits} créditos</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#4ABAFF', fontWeight: 700, fontFamily: 'Luna, sans-serif', fontSize: 18 }}>${pk.price}</p>
                  <a href="/" className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>{t.landing.buy}</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(100,200,255,0.08)', padding: '32px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.3)', fontFamily: 'Luna, sans-serif' }}>
          {t.nav.disclaimer}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.2)', marginTop: 8, fontFamily: 'Luna, sans-serif' }}>
          © 2025 Solvik Studio · <a href="/terms" style={{ color: 'rgba(180,210,255,0.3)', textDecoration: 'none' }}>{t.nav.terms}</a>
        </p>
      </footer>
    </div>
  )
}
