'use client'
import { useState, useEffect, useCallback } from 'react'
import { Search, Download, ExternalLink, Loader2 } from 'lucide-react'
import { useTranslation } from '@/components/LanguageProvider'
import { LOCALE_DATE } from '@/lib/i18n'

type Certificate = {
  id: string; arweave_tx_id: string; issued_to: string; doc_type: string
  file_name: string; issued_at: string; expires_at: string | null; cnft_address: string | null
}

export default function CertsPage() {
  const { t, locale } = useTranslation()
  const dateLocale = LOCALE_DATE[locale]
  const [certs, setCerts]           = useState<Certificate[]>([])
  const [search, setSearch]         = useState('')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const fetchCerts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', search })
      const res = await fetch(`/api/certificates?${params}`)
      const data = (await res.json()) as { data: Certificate[]; total: number }
      setCerts(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch {}
    setLoading(false)
  }, [page, search])

  useEffect(() => {
    const id = setTimeout(fetchCerts, search ? 400 : 0)
    return () => clearTimeout(id)
  }, [fetchCerts, search])

  const downloadPDF = async (cert: Certificate) => {
    setDownloadingId(cert.id)
    try {
      const res = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arweave_tx_id: cert.arweave_tx_id }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `certificate-${cert.issued_to}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch {}
    setDownloadingId(null)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div>
      <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 8 }}>{t.certs.title}</h1>
      <p style={{ color: 'rgba(180,210,255,0.5)', fontSize: 14, fontFamily: 'Luna, sans-serif', marginBottom: 32 }}>{total} {t.certs.total}</p>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <Search size={16} color="rgba(180,210,255,0.4)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder={t.certs.search_placeholder} style={{ paddingLeft: 40, marginBottom: 0 }} />
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Loader2 size={28} color="#4ABAFF" className="animate-spin" /></div>
        ) : certs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'rgba(180,210,255,0.4)', fontFamily: 'Luna, sans-serif', fontSize: 14 }}>
            {search ? t.certs.no_results : t.certs.empty}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Luna, sans-serif', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(100,200,255,0.1)' }}>
                {[t.certs.recipient, t.certs.type, t.certs.date, t.certs.expires, t.certs.actions].map(h => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'rgba(180,210,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {certs.map(cert => (
                <tr key={cert.id} style={{ borderBottom: '1px solid rgba(100,200,255,0.06)' }}>
                  <td style={{ padding: '12px 20px', color: '#F0F8FF', fontWeight: 500 }}>{cert.issued_to}</td>
                  <td style={{ padding: '12px 20px', color: 'rgba(180,210,255,0.6)' }}>{cert.doc_type}</td>
                  <td style={{ padding: '12px 20px', color: 'rgba(180,210,255,0.6)' }}>{new Date(cert.issued_at).toLocaleDateString(dateLocale)}</td>
                  <td style={{ padding: '12px 20px', color: 'rgba(180,210,255,0.4)', fontSize: 13 }}>
                    {cert.expires_at ? new Date(cert.expires_at).toLocaleDateString(dateLocale) : '—'}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <a href={`/verify/${cert.arweave_tx_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4ABAFF', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                        <ExternalLink size={13} />{t.certs.view_qr}
                      </a>
                      <button onClick={() => downloadPDF(cert)} disabled={downloadingId === cert.id} style={{ background: 'none', border: 'none', color: 'rgba(180,210,255,0.6)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontFamily: 'Luna, sans-serif' }}>
                        {downloadingId === cert.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button className="btn-secondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 16px', fontSize: 13 }}>{t.certs.prev}</button>
          <span style={{ display: 'flex', alignItems: 'center', color: 'rgba(180,210,255,0.5)', fontSize: 13, fontFamily: 'Luna, sans-serif', padding: '0 8px' }}>{page} / {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '8px 16px', fontSize: 13 }}>{t.certs.next}</button>
        </div>
      )}
    </div>
  )
}
