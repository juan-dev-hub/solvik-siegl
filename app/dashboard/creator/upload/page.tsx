'use client'
import { useState, useRef } from 'react'
import { Upload, CheckCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CreatorUploadPage() {
  const router = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)
  const thumbRef = useRef<HTMLInputElement>(null)
  const [file, setFile]       = useState<File | null>(null)
  const [thumb, setThumb]     = useState<File | null>(null)
  const [title, setTitle]     = useState('')
  const [desc, setDesc]       = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const ALLOWED = ['application/pdf', 'image/webp', 'video/webm']

  const validateFile = (f: File) => {
    if (!ALLOWED.includes(f.type)) { setError('Solo PDF, WebP o WebM.'); return false }
    if (f.size > 5 * 1024 * 1024) { setError('Máx 5 MB.'); return false }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title.trim()) { setError('Archivo y título obligatorios.'); return }
    setUploading(true); setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      if (thumb) form.append('thumbnail', thumb)
      form.append('title', title)
      form.append('description', desc)
      form.append('is_premium', String(isPremium))
      const res = await fetch('/api/creator/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
      setTimeout(() => router.push('/dashboard/creator'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setUploading(false) }
  }

  if (done) return (
    <div style={{ textAlign: 'center', padding: 64 }}>
      <CheckCircle size={48} color="#52C878" style={{ margin: '0 auto 16px', display: 'block' }} />
      <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 22, color: '#52C878' }}>¡Contenido publicado!</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 8 }}>Subir contenido</h1>
      <p style={{ color: 'rgba(180,210,255,0.45)', fontSize: 14, marginBottom: 32 }}>PDF, WebP o WebM · máx 5 MB</p>

      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 16, fontFamily: 'Luna, sans-serif' }}>{error}</p>}

        <input type="file" ref={fileRef} accept=".pdf,.webp,.webm" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f && validateFile(f)) setFile(f) }} />
        <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${file ? '#52C878' : 'rgba(74,186,255,0.3)'}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', marginBottom: 24 }}>
          {file ? <p style={{ color: '#52C878', fontFamily: 'Luna, sans-serif', fontWeight: 600 }}>✓ {file.name}</p> : <><Upload size={28} color="rgba(74,186,255,0.4)" style={{ margin: '0 auto 8px', display: 'block' }} /><p style={{ color: 'rgba(180,210,255,0.5)', fontFamily: 'Luna, sans-serif' }}>Click para seleccionar archivo</p></>}
        </div>

        <input type="file" ref={thumbRef} accept=".webp,image/webp" style={{ display: 'none' }} onChange={e => setThumb(e.target.files?.[0] ?? null)} />
        <button type="button" onClick={() => thumbRef.current?.click()} style={{ padding: '10px 18px', background: 'rgba(0,30,80,0.3)', border: `1px solid ${thumb ? 'rgba(74,186,255,0.4)' : 'rgba(74,186,255,0.12)'}`, borderRadius: 10, cursor: 'pointer', color: thumb ? '#4ABAFF' : 'rgba(180,210,255,0.4)', fontSize: 13, fontFamily: 'Luna, sans-serif', marginBottom: 20 }}>
          {thumb ? `✓ ${thumb.name}` : 'Miniatura WebP (opcional)'}
        </button>

        <label style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Título *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre del contenido" maxLength={100} />

        <label style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Descripción</label>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción opcional..." rows={3} maxLength={500} style={{ resize: 'vertical' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div onClick={() => setIsPremium(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, background: isPremium ? '#4ABAFF' : 'rgba(100,180,255,0.12)', border: `1px solid ${isPremium ? '#4ABAFF' : 'rgba(100,180,255,0.2)'}`, position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
            <div style={{ position: 'absolute', top: 3, left: isPremium ? 22 : 3, width: 16, height: 16, borderRadius: '50%', background: isPremium ? '#fff' : 'rgba(180,210,255,0.4)', transition: 'left 0.2s' }} />
          </div>
          <span style={{ fontSize: 14, color: 'rgba(180,210,255,0.7)', fontFamily: 'Luna, sans-serif' }}>Solo suscriptores</span>
        </div>

        <button type="submit" className="btn-primary" disabled={uploading} style={{ width: '100%', justifyContent: 'center' }}>
          {uploading ? <><Loader2 size={16} className="animate-spin" /> Subiendo...</> : 'Publicar contenido'}
        </button>
      </form>
    </div>
  )
}
