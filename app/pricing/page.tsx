'use client'
import { useTranslation } from '@/components/LanguageProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { WalletAuthButton } from '@/components/WalletAuthButton'
import { CheckCircle } from 'lucide-react'

const PLANS = [
  { id: 'starter', price: 9,  credits: 15,  features: ['15 certificates/month', 'PDF + QR', 'Arweave permanent storage', 'Solana cNFT'] },
  { id: 'pro',     price: 25, credits: 60,  features: ['60 certificates/month', 'PDF + QR', 'Arweave permanent storage', 'Solana cNFT', 'On-chain attestation', 'SNS domain badge'], popular: true },
  { id: 'studio',  price: 59, credits: 200, features: ['200 certificates/month', 'PDF + QR', 'Arweave permanent storage', 'Solana cNFT', 'On-chain attestation', 'SNS domain badge', 'Batch ZIP upload', 'Public issuer page'] },
]

export default function PricingPage() {
  const { t } = useTranslation()

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(100,200,255,0.08)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 32, objectFit: 'contain', borderRadius: 6 }} />
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 18, color: '#F0F8FF' }}>Solvik Studio</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <LanguageSwitcher />
          <WalletAuthButton />
        </div>
      </nav>

      <div className="page-container">
        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 40, color: '#F0F8FF', textAlign: 'center', marginBottom: 12 }}>
          {t.pricing.title}
        </h1>
        <p style={{ textAlign: 'center', color: 'rgba(180,210,255,0.55)', fontSize: 16, fontFamily: 'Inter, sans-serif', marginBottom: 56 }}>
          {t.pricing.sub}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 60 }}>
          {PLANS.map(p => (
            <div key={p.id} className="glass-card" style={{ border: p.popular ? '1px solid #4ABAFF' : undefined, position: 'relative' }}>
              {p.popular && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #4ABAFF, #00D4AA)', color: '#fff', borderRadius: 50, padding: '3px 18px', fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>
                  {t.landing.most_popular}
                </div>
              )}
              <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 22, color: '#F0F8FF', textTransform: 'capitalize', marginBottom: 6 }}>{p.id}</p>
              <p style={{ fontSize: 40, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#4ABAFF', lineHeight: 1 }}>
                ${p.price}<span style={{ fontSize: 16, color: 'rgba(180,210,255,0.5)', fontWeight: 400 }}>{t.landing.per_month}</span>
              </p>
              <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.5)', fontFamily: 'Inter, sans-serif', marginBottom: 24, marginTop: 6 }}>
                {p.credits} {t.landing.credits}
              </p>
              <div style={{ marginBottom: 28 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <CheckCircle size={14} color="#52C878" />
                    <span style={{ fontSize: 13, color: 'rgba(180,210,255,0.7)', fontFamily: 'Inter, sans-serif' }}>{f}</span>
                  </div>
                ))}
              </div>
              <a href="/" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {t.landing.get_plan} {p.id}
              </a>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(74,186,255,0.06)', border: '1px solid rgba(74,186,255,0.15)', borderRadius: 16, padding: '24px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.6)', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>
            {t.landing.disclaimer_card}
          </p>
        </div>
      </div>
    </div>
  )
}
