'use client'
import { useTranslation } from '@/components/LanguageProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { AlertTriangle } from 'lucide-react'

export default function TermsPage() {
  const { t } = useTranslation()

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(100,200,255,0.08)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 32, objectFit: 'contain', borderRadius: 6 }} />
          <span style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 18, color: '#F0F8FF' }}>Solvik Studio</span>
        </a>
        <LanguageSwitcher />
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 40px' }}>
        <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 36, color: '#F0F8FF', marginBottom: 32 }}>
          {t.terms.title}
        </h1>

        <div style={{ border: '2px solid rgba(255,229,102,0.6)', background: 'rgba(255,229,102,0.06)', borderRadius: 16, padding: '20px 24px', marginBottom: 40, display: 'flex', gap: 16 }}>
          <AlertTriangle size={24} color="#FFE566" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 15, color: '#FFE566', fontFamily: 'Luna, sans-serif', lineHeight: 1.7, fontWeight: 600 }}>
            {t.terms.warning}
          </p>
        </div>

        {t.terms.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 16, color: '#4ABAFF', marginBottom: 12 }}>
              {i + 1}. {s.title}
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(180,210,255,0.75)', fontFamily: 'Luna, sans-serif', lineHeight: 1.8 }}>
              {s.body}
            </p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid rgba(100,200,255,0.1)', paddingTop: 24, marginTop: 40 }}>
          <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.3)', fontFamily: 'Luna, sans-serif' }}>
            powered by Solvik Studio · Solvik Studio
          </p>
        </div>
      </div>
    </div>
  )
}
