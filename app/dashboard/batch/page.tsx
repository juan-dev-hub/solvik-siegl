'use client'
import { useState, useRef, DragEvent, useEffect } from 'react'
import { FolderOpen, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import JSZip from 'jszip'
import { useTranslation } from '@/components/LanguageProvider'

type JobStatus = { id: string; total_files: number; processed: number; succeeded: number; failed: number; status: string }

export default function BatchPage() {
  const { t } = useTranslation()
  const [zipFile, setZipFile]           = useState<File | null>(null)
  const [dragging, setDragging]         = useState(false)
  const [docType, setDocType]           = useState(t.doc_types[0].value)
  const [expiresAt, setExpiresAt]       = useState('')
  const [previewFiles, setPreviewFiles] = useState<string[]>([])
  const [jobId, setJobId]               = useState<string | null>(null)
  const [jobStatus, setJobStatus]       = useState<JobStatus | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [submitting, setSubmitting]     = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const pollRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadPreview = async (f: File) => {
    try {
      const zip = await JSZip.loadAsync(f)
      const names: string[] = []
      zip.forEach((path, entry) => {
        if (!entry.dir) {
          const ext = path.split('.').pop()?.toLowerCase()
          if (ext && ['pdf', 'webp', 'webm'].includes(ext)) names.push(path.split('/').pop() ?? path)
        }
      })
      setPreviewFiles(names.slice(0, 20))
    } catch { setPreviewFiles([]) }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.zip')) { setZipFile(f); loadPreview(f) }
    else setError(t.batch.zip_only)
  }

  const handleSubmit = async () => {
    if (!zipFile) return
    setError(null); setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('zip', zipFile); fd.append('doc_type', docType)
      if (expiresAt) fd.append('expires_at', expiresAt)
      const res = await fetch('/api/certificates/batch', { method: 'POST', body: fd })
      const data = (await res.json()) as { batch_job_id?: string; error?: string }
      if (!res.ok || data.error) { setError(data.error ?? 'Error'); return }
      setJobId(data.batch_job_id!)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setSubmitting(false) }
  }

  useEffect(() => {
    if (!jobId) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/certificates/batch/${jobId}`)
        const data = (await res.json()) as JobStatus
        setJobStatus(data)
        if (data.status !== 'done') pollRef.current = setTimeout(poll, 2000)
      } catch {}
    }
    poll()
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [jobId])

  const progress = jobStatus ? Math.round((jobStatus.processed / jobStatus.total_files) * 100) : 0

  return (
    <div>
      <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 8 }}>{t.batch.title}</h1>
      <p style={{ color: 'rgba(180,210,255,0.5)', fontSize: 14, fontFamily: 'Luna, sans-serif', marginBottom: 36 }}>{t.batch.subtitle}</p>

      {jobId && jobStatus ? (
        <div className="glass-card">
          <h2 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 20, color: '#F0F8FF', marginBottom: 20 }}>
            {jobStatus.status === 'done' ? t.batch.done : t.batch.processing}
          </h2>
          <div style={{ background: 'rgba(0,20,60,0.4)', borderRadius: 50, height: 8, marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #4ABAFF, #00D4AA)', borderRadius: 50, transition: 'width 0.4s ease' }} />
          </div>
          <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.6)', fontFamily: 'Luna, sans-serif', marginBottom: 20 }}>
            {jobStatus.processed} / {jobStatus.total_files} {t.batch.processed}
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            <span className="badge-verified">{jobStatus.succeeded} {t.batch.successful}</span>
            {jobStatus.failed > 0 && <span className="badge-pending">{jobStatus.failed} {t.batch.failed}</span>}
          </div>
          {jobStatus.status === 'done' && (
            <button onClick={() => { setJobId(null); setJobStatus(null); setZipFile(null); setPreviewFiles([]) }} className="btn-secondary" style={{ marginTop: 24 }}>
              {t.batch.upload_another}
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className="glass-card" style={{ marginBottom: 24, background: 'rgba(0,80,160,0.12)', borderColor: 'rgba(74,186,255,0.2)' }}>
            <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.8)', fontFamily: 'Luna, sans-serif', lineHeight: 1.7 }}>
              {t.batch.instructions}<br />
              <strong style={{ color: '#4ABAFF' }}>{t.batch.example}</strong>{' '}
              <code style={{ background: 'rgba(0,30,80,0.5)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>Maria García.pdf</code>{' '}
              {t.batch.example_desc} Maria García<br /><br />
              {t.batch.formats}
            </p>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            style={{ border: `2px dashed ${dragging ? '#00D4AA' : zipFile ? '#52C878' : 'rgba(74,186,255,0.3)'}`, borderRadius: 16, padding: '56px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(0,212,170,0.04)' : 'rgba(0,20,60,0.3)', transition: 'all 0.2s', marginBottom: 24 }}
          >
            {zipFile ? (
              <div>
                <CheckCircle size={32} color="#52C878" style={{ margin: '0 auto 10px' }} />
                <p style={{ color: '#52C878', fontFamily: 'Luna, sans-serif', fontWeight: 600 }}>{zipFile.name}</p>
                <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.4)', marginTop: 4 }}>
                  {(zipFile.size / 1024 / 1024).toFixed(2)} MB · {previewFiles.length} {t.batch.valid_files}
                </p>
              </div>
            ) : (
              <div>
                <FolderOpen size={32} color="rgba(74,186,255,0.5)" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'rgba(180,210,255,0.7)', fontFamily: 'Luna, sans-serif', fontSize: 15 }}>
                  {t.batch.drop_zone}{' '}<span style={{ color: '#4ABAFF', fontWeight: 600 }}>{t.batch.click}</span>
                </p>
                <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.35)', marginTop: 8 }}>{t.batch.max_zip}</p>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setZipFile(f); loadPreview(f) } }} />

          {previewFiles.length > 0 && (
            <div className="glass-card" style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.45)', fontFamily: 'Luna, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                {t.batch.detected} ({previewFiles.length})
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {previewFiles.map(f => (
                  <span key={f} style={{ background: 'rgba(74,186,255,0.08)', border: '1px solid rgba(74,186,255,0.15)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: 'rgba(180,210,255,0.7)', fontFamily: 'Luna, sans-serif' }}>
                    {f.replace(/\.[^.]+$/, '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(180,210,255,0.5)', marginBottom: 6, fontFamily: 'Luna, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.batch.doc_type_label}</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}>
                {t.doc_types.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'rgba(180,210,255,0.5)', marginBottom: 6, fontFamily: 'Luna, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.batch.expiry_label}</label>
              <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
          </div>

          {zipFile && previewFiles.length > 0 && (
            <div style={{ background: 'rgba(74,186,255,0.06)', border: '1px solid rgba(74,186,255,0.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, fontFamily: 'Luna, sans-serif', fontSize: 14, color: 'rgba(180,210,255,0.7)' }}>
              {t.batch.will_issue}{' '}<strong style={{ color: '#4ABAFF' }}>{previewFiles.length} {t.batch.certificates}</strong>. {t.batch.ensure_credits}
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ff6b6b', fontSize: 13, fontFamily: 'Luna, sans-serif', marginBottom: 16, padding: '10px 14px', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8 }}>
              <AlertCircle size={15} />{error}
            </div>
          )}

          <button className="btn-primary" onClick={handleSubmit} disabled={!zipFile || previewFiles.length === 0 || submitting} style={{ width: '100%', justifyContent: 'center' }}>
            {submitting ? <><Loader2 size={16} className="animate-spin" />{t.batch.starting}</> : `${t.batch.process} ${previewFiles.length} ${t.batch.certificates}`}
          </button>
        </div>
      )}
    </div>
  )
}
