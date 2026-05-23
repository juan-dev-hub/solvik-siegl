'use client'
import { CheckCircle, ExternalLink, AlertCircle } from 'lucide-react'
import { useTranslation } from '@/components/LanguageProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { LOCALE_DATE } from '@/lib/i18n'

type CertData = {
  arweave_tx_id: string
  issued_to: string
  issuer_wallet: string
  issuer_name: string
  doc_type: string
  issued_at: string
  expires_at: string | null
  cnft_address: string | null
  attestation_pda: string | null
  issuers: { institution_name: string; sns_domain: string | null; sns_verified: boolean } | null
  attestationActive: boolean
}

function truncate(s: string) { return `${s.slice(0, 6)}...${s.slice(-6)}` }

export function VerifyCard({ cert }: { cert: CertData }) {
  const { t, locale } = useTranslation()
  const dateLocale = LOCALE_DATE[locale]

  const isTicket = cert.doc_type === 'ticket'
  const eventPassed = cert.expires_at ? new Date(cert.expires_at) < new Date() : false

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(100,200,255,0.08)' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 32, objectFit: 'contain', borderRadius: 6 }} />
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 18, color: '#F0F8FF' }}>Solvik Studio</span>
        </a>
        <LanguageSwitcher />
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div className="glass-card" style={{ maxWidth: 560, width: '100%' }}>
          {/* Verified badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ background: 'rgba(82,200,120,0.15)', border: '1px solid #52C878', borderRadius: 50, padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16} color="#52C878" />
              <span style={{ color: '#52C878', fontWeight: 700, fontFamily: 'Nunito, sans-serif', fontSize: 14 }}>
                {t.verify.verified_badge}
              </span>
            </div>
            {isTicket && (
              <span className={eventPassed ? 'badge-verified' : 'badge-gold'} style={{ fontSize: 11 }}>
                {eventPassed ? t.verify.ticket_after : t.verify.ticket_before}
              </span>
            )}
          </div>

          {/* Issuer */}
          <div style={{ marginBottom: 20 }}>
            <p className="section-title">{t.verify.issuer}</p>
            <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 20, color: '#F0F8FF' }}>
              {cert.issuers?.institution_name ?? cert.issuer_name}
            </p>
            {cert.issuers?.sns_verified && cert.issuers.sns_domain && (
              <span className="badge-gold" style={{ marginTop: 6, display: 'inline-block' }}>
                ✓ {cert.issuers.sns_domain}
              </span>
            )}
            <p className="wallet-address" style={{ marginTop: 8, display: 'inline-block' }}>
              {truncate(cert.issuer_wallet)}
            </p>
          </div>

          {/* Recipient */}
          <div style={{ marginBottom: 20 }}>
            <p className="section-title">{t.verify.recipient}</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#F0F8FF', fontFamily: 'Nunito, sans-serif' }}>{cert.issued_to}</p>
          </div>

          {/* Meta */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <p className="section-title">{t.verify.doc_type}</p>
              <p style={{ color: 'rgba(180,210,255,0.8)', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>{cert.doc_type}</p>
            </div>
            <div>
              <p className="section-title">{t.verify.issued}</p>
              <p style={{ color: 'rgba(180,210,255,0.8)', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
                {new Date(cert.issued_at).toLocaleDateString(dateLocale)}
              </p>
            </div>
            <div>
              <p className="section-title">{t.verify.expires}</p>
              <p style={{ color: 'rgba(180,210,255,0.8)', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
                {cert.expires_at ? new Date(cert.expires_at).toLocaleDateString(dateLocale) : t.verify.no_expiry}
              </p>
            </div>
            <div>
              <p className="section-title">{t.verify.attestation}</p>
              <span className={cert.attestationActive ? 'badge-verified' : 'badge-pending'} style={{ fontSize: 11 }}>
                {cert.attestationActive ? t.verify.attestation_active : t.verify.attestation_inactive}
              </span>
            </div>
          </div>

          {/* Arweave */}
          <div style={{ marginBottom: 24 }}>
            <p className="section-title">{t.verify.arweave_hash}</p>
            <a
              href={`https://arweave.net/${cert.arweave_tx_id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4ABAFF', fontSize: 12, fontFamily: 'SF Mono, Fira Code, monospace', textDecoration: 'none', wordBreak: 'break-all' }}
            >
              {cert.arweave_tx_id}
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Disclaimer */}
          <div style={{ border: '1px solid rgba(180,210,255,0.12)', borderRadius: 12, padding: '14px 18px', background: 'rgba(0,20,60,0.3)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertCircle size={14} color="rgba(180,210,255,0.4)" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.45)', fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
                {t.verify.disclaimer}
              </p>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(180,210,255,0.25)', fontFamily: 'Inter, sans-serif' }}>
            {t.verify.powered}
          </p>
        </div>
      </div>
    </div>
  )
}
