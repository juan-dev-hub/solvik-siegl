'use client'
import { useState, useRef, DragEvent } from 'react'
import { Upload, CheckCircle, Loader2 } from 'lucide-react'
import { useTranslation } from '@/components/LanguageProvider'
import { useToast } from '@/components/ToastProvider'
import { InfoTip } from '@/components/InfoTip'

type Step = 'idle' | 'uploading_arweave' | 'minting_cnft' | 'attestation' | 'done' | 'error'

export default function NewCertPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [file, setFile]           = useState<File | null>(null)
  const [dragging, setDragging]   = useState(false)
  const [issuedTo, setIssuedTo]   = useState('')
  const [docType, setDocType]     = useState(t.doc_types[0].value)
  const [expiresAt, setExpiresAt] = useState('')
  const [step, setStep]           = useState<Step>('idle')
  const [result, setResult]       = useState<{ arweave_tx_id: string; verify_url: string; pdf: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const STEP_LABELS: Record<Step, string> = {
    idle: '', uploading_arweave: t.new_cert.uploading, minting_cnft: t.new_cert.minting,
    attestation: t.new_cert.attestation_step, done: t.new_cert.done, error: t.new_cert.error,
  }

  const validate = (f: File) => {
    const allowed = ['application/pdf', 'image/webp', 'video/webm']
    if (!allowed.includes(f.type)) {
      toast.error('Tipo de archivo no permitido', t.new_cert.file_type_error)
      return false
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error('Archivo demasiado grande', t.new_cert.file_size_error)
      return false
    }
    return true
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && validate(f)) setFile(f)
  }

  const handleSubmit = async () => {
    if (!file || !issuedTo.trim()) {
      toast.error('Campos incompletos', t.new_cert.fields_error)
      return
    }

    setStep('uploading_arweave')

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('issued_to', issuedTo.trim())
      fd.append('doc_type', docType)
      if (expiresAt) fd.append('expires_at', expiresAt)

      const res = await fetch('/api/certificates/upload', {
        method: 'POST',
        body: fd,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      setStep('minting_cnft')
      await new Promise(r => setTimeout(r, 800))
      setStep('attestation')
      await new Promise(r => setTimeout(r, 600))

      const data = (await res.json()) as { arweave_tx_id?: string; verify_url?: string; pdf?: string; error?: string }
      if (!res.ok || data.error) {
        toast.error('Error al emitir certificado', data.error ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.')
        setStep('error')
        return
      }

      setResult({ arweave_tx_id: data.arweave_tx_id!, verify_url: data.verify_url!, pdf: data.pdf! })
      setStep('done')
      toast.success('Certificado emitido', 'Guardado permanentemente en Arweave.')
    } catch (e) {
      clearTimeout(timeoutId)
      setStep('error')
      if (e instanceof Error && e.name === 'AbortError') {
        toast.error(
          'Tiempo de espera agotado',
          'La subida tardó más de 30 segundos. Verifica tu conexión e inténtalo de nuevo.'
        )
      } else {
        toast.error('Error al subir', e instanceof Error ? e.message : String(e))
      }
    }
  }

  const downloadPDF = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = `data:application/pdf;base64,${result.pdf}`
    a.download = `certificate-${issuedTo}.pdf`
    a.click()
  }

  const reset = () => {
    setFile(null); setIssuedTo(''); setDocType(t.doc_types[0].value)
    setExpiresAt(''); setStep('idle'); setResult(null)
  }

  const steps = [t.new_cert.uploading, t.new_cert.minting, t.new_cert.attestation_step, t.new_cert.done]
  const stepIndex: Record<Step, number> = { idle: -1, uploading_arweave: 0, minting_cnft: 1, attestation: 2, done: 3, error: -1 }
  const currentIdx = stepIndex[step]

  return (
    <div>
      <h1 style={{ fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 8 }}>
        {t.new_cert.title}
      </h1>
      <p style={{ color: 'rgba(180,210,255,0.5)', fontSize: 14, marginBottom: 36 }}>
        {t.new_cert.subtitle}
      </p>

      {step === 'done' && result ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 56 }}>
          <CheckCircle size={48} color="#52C878" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontWeight: 700, fontSize: 24, color: '#F0F8FF', marginBottom: 12 }}>
            {t.new_cert.success_title}
          </h2>
          <p style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 11, color: 'rgba(180,210,255,0.4)', marginBottom: 28, wordBreak: 'break-all' }}>
            {result.arweave_tx_id}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={result.verify_url} className="btn-secondary">{t.new_cert.view_cert}</a>
            <button className="btn-primary" onClick={downloadPDF}>{t.new_cert.download_pdf}</button>
          </div>
          <button onClick={reset} style={{ marginTop: 24, background: 'none', border: 'none', color: 'rgba(180,210,255,0.35)', cursor: 'pointer', fontSize: 13 }}>
            {t.new_cert.issue_another}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
          <div>
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              style={{ border: `2px dashed ${dragging ? '#00D4AA' : file ? '#52C878' : 'rgba(74,186,255,0.3)'}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(0,212,170,0.04)' : 'rgba(0,20,60,0.3)', transition: 'all 0.2s', marginBottom: 24 }}
            >
              {file ? (
                <div>
                  <CheckCircle size={32} color="#52C878" style={{ margin: '0 auto 10px' }} />
                  <p style={{ color: '#52C878', fontWeight: 600 }}>{file.name}</p>
                  <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.4)', marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <Upload size={32} color="rgba(74,186,255,0.5)" style={{ margin: '0 auto 12px' }} />
                  <p style={{ color: 'rgba(180,210,255,0.7)', fontSize: 15 }}>
                    {t.new_cert.drop_here}{' '}<span style={{ color: '#4ABAFF', fontWeight: 600 }}>{t.new_cert.click}</span>
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.35)', marginTop: 8 }}>{t.new_cert.file_hint}</p>
                </div>
              )}
            </div>
            <input ref={inputRef} type="file" accept=".pdf,.webp,.webm,application/pdf,image/webp,video/webm" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f && validate(f)) setFile(f) }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <label style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.new_cert.recipient_label}</label>
              <InfoTip title="Destinatario" text="Nombre completo de quien recibe el certificado. Este nombre aparecerá en el QR de verificación pública." position="right" />
            </div>
            <input value={issuedTo} onChange={e => setIssuedTo(e.target.value)} placeholder={t.new_cert.recipient_placeholder} disabled={step !== 'idle' && step !== 'error'} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <label style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.new_cert.doc_type_label}</label>
              <InfoTip title="Tipo de documento" text="Categoriza el certificado. Sirve para filtrar y organizar tu historial. No afecta la verificación." position="right" />
            </div>
            <select value={docType} onChange={e => setDocType(e.target.value)} disabled={step !== 'idle' && step !== 'error'}>
              {t.doc_types.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <label style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.new_cert.expiry_label}</label>
              <InfoTip title="Vencimiento (opcional)" text="Si el certificado tiene vigencia limitada (ej: habilitación anual), ponés la fecha acá. Sin fecha = permanente." position="right" />
            </div>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} disabled={step !== 'idle' && step !== 'error'} style={{ colorScheme: 'dark' }} />

            <div style={{ background: 'rgba(74,186,255,0.06)', border: '1px solid rgba(74,186,255,0.12)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'rgba(180,210,255,0.55)' }}>
              {t.new_cert.cost_note}
            </div>

            <button className="btn-primary" onClick={handleSubmit} disabled={!file || !issuedTo.trim() || (step !== 'idle' && step !== 'error')} style={{ width: '100%', justifyContent: 'center' }}>
              {step !== 'idle' && step !== 'error' ? (
                <><Loader2 size={16} className="animate-spin" />{STEP_LABELS[step]}</>
              ) : t.new_cert.submit}
            </button>
          </div>

          {/* Progress panel */}
          <div className="glass-card" style={{ alignSelf: 'start' }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#F0F8FF', marginBottom: 20 }}>{t.new_cert.progress}</p>
            {steps.map((s, i) => {
              const done   = currentIdx > i || step === 'done'
              const active = currentIdx === i
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#52C878' : active ? 'rgba(74,186,255,0.2)' : 'rgba(100,150,200,0.1)', border: active ? '2px solid #4ABAFF' : 'none', flexShrink: 0 }}>
                    {done ? <CheckCircle size={14} color="white" /> : active ? <Loader2 size={12} color="#4ABAFF" className="animate-spin" /> : <span style={{ fontSize: 10, color: 'rgba(180,210,255,0.3)', fontWeight: 600 }}>{i + 1}</span>}
                  </div>
                  <span style={{ fontSize: 13, color: done ? '#52C878' : active ? '#4ABAFF' : 'rgba(180,210,255,0.3)', fontWeight: active || done ? 500 : 400 }}>{s}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
