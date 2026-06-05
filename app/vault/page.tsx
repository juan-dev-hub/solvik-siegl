'use client'
import { useState, useEffect, useRef } from 'react'
import { HardDrive, Upload, File, Loader2 } from 'lucide-react'

type VaultAccount = { storage_gb: number; storage_used_gb: number; expires_at: string | null }
type VaultFile    = { id: string; file_name: string; shadow_url: string; file_size_bytes: number; file_type: string; uploaded_at: string }

export default function VaultPage() {
  const [vault, setVault]   = useState<VaultAccount | null>(null)
  const [files, setFiles]   = useState<VaultFile[]>([])
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const fetchVault = () => {
    fetch('/api/vault/info').then(r => r.json()).then(d => {
      setVault(d.vault ?? null)
      setFiles(d.files ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchVault() }, [])

  const handleUpload = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) { setError('Máx 5 MB'); return }
    const allowed = ['application/pdf', 'image/webp', 'video/webm']
    if (!allowed.includes(f.type)) { setError('Solo PDF, WebP o WebM'); return }
    setUploading(true); setError(null)
    try {
      const form = new FormData()
      form.append('file', f)
      const res = await fetch('/api/vault/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchVault()
    } catch (err) { setError(err instanceof Error ? err.message : 'Error') }
    finally { setUploading(false) }
  }

  const pctUsed = vault ? Math.min(100, (vault.storage_used_gb / vault.storage_gb) * 100) : 0

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'rgba(180,210,255,0.4)' }}>Cargando...</div>

  return (
    <div style={{ minHeight: '100vh', padding: 'clamp(24px,5vw,48px) clamp(16px,5vw,40px)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 32, color: '#F0F8FF', marginBottom: 8 }}>
          <HardDrive size={28} style={{ marginRight: 12, verticalAlign: 'middle' }} />
          Mi Vault
        </h1>

        {!vault ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 20, color: '#F0F8FF', marginBottom: 12 }}>Tu vault personal no está activo</p>
            <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.5)', marginBottom: 28 }}>Almacenamiento en la nube privado por $25 USDC/año.</p>
            <button className="btn-primary">Activar Vault — $25/año</button>
          </div>
        ) : (
          <>
            <div className="glass-card" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(180,210,255,0.5)', fontFamily: 'Luna, sans-serif' }}>
                  {vault.storage_used_gb.toFixed(2)} GB de {vault.storage_gb.toFixed(2)} GB
                </span>
                {vault.expires_at && (
                  <span style={{ fontSize: 11, color: 'rgba(180,210,255,0.35)', fontFamily: 'Luna, sans-serif' }}>
                    Vence {new Date(vault.expires_at).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>
              <div style={{ height: 8, background: 'rgba(123,47,255,0.2)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: `${pctUsed}%`, height: '100%', background: pctUsed > 80 ? '#FF6B6B' : 'linear-gradient(90deg, #4ABAFF, #00D4AA)', borderRadius: 8, transition: 'width 0.5s ease' }} />
              </div>
            </div>

            <input type="file" accept=".pdf,.webp,.webm" style={{ display: 'none' }} ref={fileInputRef} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
            <button className="btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
              {uploading ? <><Loader2 size={16} className="animate-spin" /> Subiendo...</> : <><Upload size={16} /> Subir archivo</>}
            </button>
            {error && <p style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 16, fontFamily: 'Luna, sans-serif' }}>{error}</p>}

            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              {files.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'rgba(180,210,255,0.4)', fontFamily: 'Luna, sans-serif' }}>No hay archivos en tu vault.</div>
              ) : files.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(100,200,255,0.06)', gap: 12 }}>
                  <File size={16} color="rgba(180,210,255,0.4)" />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#F0F8FF', fontSize: 14, fontWeight: 500 }}>{f.file_name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(180,210,255,0.35)', fontFamily: 'Luna, sans-serif' }}>
                      {(f.file_size_bytes / 1024 / 1024).toFixed(2)} MB · {new Date(f.uploaded_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <a href={f.shadow_url} target="_blank" rel="noopener noreferrer" style={{ color: '#4ABAFF', fontSize: 13, textDecoration: 'none' }}>Abrir</a>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
