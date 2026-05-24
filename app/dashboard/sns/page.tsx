'use client'
import { useState } from 'react'
import { useTranslation } from '@/components/LanguageProvider'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function SNSPage() {
  const { t } = useTranslation()
  const [domain, setDomain]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<{ verified: boolean; domain?: string; message?: string } | null>(null)

  const handleVerify = async () => {
    if (!domain.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/sns/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      })
      setResult(await res.json())
    } catch (e) {
      setResult({ verified: false, message: e instanceof Error ? e.message : String(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 8 }}>
        {t.dashboard.verify_sns}
      </h1>
      <p style={{ color: 'rgba(180,210,255,0.5)', fontSize: 14, fontFamily: 'Luna, sans-serif', marginBottom: 36 }}>
        Vincula tu dominio .sol a tu wallet para mostrar un badge verificado en tus certificados.
      </p>

      <div className="glass-card" style={{ maxWidth: 500 }}>
        <label style={{ display: 'block', fontSize: 12, color: 'rgba(180,210,255,0.5)', marginBottom: 6, fontFamily: 'Luna, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Dominio .sol
        </label>
        <input
          value={domain}
          onChange={e => setDomain(e.target.value)}
          placeholder="miinstitucion.sol"
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
        />

        <button className="btn-primary" onClick={handleVerify} disabled={loading || !domain.trim()} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? <><Loader2 size={16} className="animate-spin" /> Verificando...</> : 'Verificar dominio'}
        </button>

        {result && (
          <div style={{ marginTop: 20, display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 10, background: result.verified ? 'rgba(82,200,120,0.1)' : 'rgba(255,80,80,0.08)', border: `1px solid ${result.verified ? 'rgba(82,200,120,0.3)' : 'rgba(255,80,80,0.2)'}` }}>
            {result.verified ? <CheckCircle size={18} color="#52C878" /> : <AlertCircle size={18} color="#ff6b6b" />}
            <p style={{ fontSize: 14, color: result.verified ? '#52C878' : '#ff6b6b', fontFamily: 'Luna, sans-serif' }}>
              {result.verified ? `✓ ${result.domain} verificado correctamente.` : result.message ?? 'No verificado.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
