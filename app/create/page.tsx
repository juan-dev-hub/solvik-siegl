'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, Upload } from 'lucide-react'

export default function CreatePage() {
  const router = useRouter()
  const [slug, setSlug]         = useState('')
  const [name, setName]         = useState('')
  const [bio, setBio]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [storageInfo, setStorageInfo] = useState<{ storageLabel: string } | null>(null)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Mostrar en tiempo real cuánto storage obtendría con la activación mínima ($15)
  useEffect(() => {
    fetch('/api/prices/shdw?usdc=15')
      .then(r => r.json())
      .then(d => setStorageInfo({ storageLabel: d.storageLabel }))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug || !name) { setError('Slug y nombre son obligatorios.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/creator/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''), display_name: name, bio }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      setTimeout(() => router.push('/dashboard/creator'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="glass-card" style={{ maxWidth: 480, width: '100%' }}>
        <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 8 }}>
          Activar canal de creador
        </h1>
        {storageInfo && (
          <p style={{ fontSize: 13, color: '#00FFB3', fontFamily: 'Luna, sans-serif', marginBottom: 24, background: 'rgba(0,255,179,0.06)', border: '1px solid rgba(0,255,179,0.2)', borderRadius: 8, padding: '8px 14px' }}>
            ✓ Con la activación ($15 USDC) obtenés {storageInfo.storageLabel} en la nube por 365 días.
          </p>
        )}

        {done ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <CheckCircle size={48} color="#52C878" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 20, color: '#52C878' }}>¡Canal activado!</p>
            <p style={{ color: 'rgba(180,210,255,0.5)', fontSize: 14, marginTop: 8 }}>Redirigiendo al dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <p style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 16, fontFamily: 'Luna, sans-serif' }}>{error}</p>}
            <label style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>URL pública</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,15,50,0.6)', border: '1px solid rgba(100,180,255,0.2)', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
              <span style={{ padding: '13px 14px', color: 'rgba(180,210,255,0.3)', fontSize: 13, borderRight: '1px solid rgba(100,180,255,0.12)', whiteSpace: 'nowrap' }}>/create/</span>
              <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="mi-canal" style={{ background: 'transparent', border: 'none', flex: 1, marginBottom: 0 }} maxLength={30} />
            </div>
            <label style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Nombre del canal</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Mi canal de contenido" maxLength={60} />
            <label style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Bio (opcional)</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Cuéntale a tus futuros suscriptores quién sos..." rows={3} maxLength={300} style={{ resize: 'vertical' }} />
            <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.3)', marginBottom: 20, fontFamily: 'Luna, sans-serif' }}>La activación del canal requiere $15 USDC que se gestionan en el siguiente paso.</p>
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creando canal...</> : 'Activar canal →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
