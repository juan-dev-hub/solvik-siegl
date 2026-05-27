'use client'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/ToastProvider'
import { ExternalLink, Eye } from 'lucide-react'

type PageSettings = {
  page_active: boolean
  page_headline: string
  page_tagline: string
  page_about: string
  page_cta: string
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.solvikstudio.com'

export default function PageSettingsPage() {
  const toast = useToast()
  const [slug, setSlug] = useState('')
  const [settings, setSettings] = useState<PageSettings>({
    page_active: false,
    page_headline: '',
    page_tagline: '',
    page_about: '',
    page_cta: '',
  })
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        if (d.issuer) {
          setSlug(d.issuer.slug ?? '')
          setSettings({
            page_active:   d.issuer.page_active   ?? false,
            page_headline: d.issuer.page_headline ?? '',
            page_tagline:  d.issuer.page_tagline  ?? '',
            page_about:    d.issuer.page_about    ?? '',
            page_cta:      d.issuer.page_cta      ?? '',
          })
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const set = <K extends keyof PageSettings>(k: K, v: PageSettings[K]) =>
    setSettings(s => ({ ...s, [k]: v }))

  const handleSlugChange = (raw: string) => {
    // only lowercase letters, numbers, hyphens
    setSlug(raw.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))
  }

  const handleSave = async () => {
    if (!slug || slug.length < 3) {
      toast.error('Slug inválido', 'El slug debe tener al menos 3 caracteres (solo letras, números y guiones).')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/issuer/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, slug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar')
      toast.success('Cambios guardados', 'Tu página pública ha sido actualizada.')
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'rgba(180,210,255,0.5)', marginBottom: 6, marginTop: 20,
    textTransform: 'uppercase', letterSpacing: '0.07em',
  }
  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,15,50,0.60)', border: '1px solid rgba(100,180,255,0.20)',
    borderRadius: 10, color: 'white', padding: '12px 14px',
    fontSize: 14, outline: 'none', width: '100%', marginBottom: 0,
    fontFamily: 'inherit', transition: 'border-color 0.2s',
  }

  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div className="animate-spin" style={{ width: 24, height: 24, border: '2px solid rgba(74,186,255,0.2)', borderTopColor: '#4ABAFF', borderRadius: '50%' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 6 }}>
            Mi página pública
          </h1>
          {slug && (
            <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.4)', fontFamily: 'SF Mono, Fira Code, monospace' }}>
              {APP_URL}/i/{slug}
            </p>
          )}
        </div>
        {slug && (
          <a
            href={`/i/${slug}`}
            className="btn-secondary"
            style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Eye size={14} /> Ver página
          </a>
        )}
      </div>

      {/* URL / Slug */}
      <div className="glass-card" style={{ marginBottom: 20, padding: '20px 24px' }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: '#F0F8FF', marginBottom: 4 }}>Tu URL pública</p>
        <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.45)', marginBottom: 16 }}>
          Esta es la dirección donde cualquiera puede ver tu página. Solo letras, números y guiones.
        </p>
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(0,15,50,0.60)', border: '1px solid rgba(100,180,255,0.20)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          <span style={{
            padding: '12px 14px', color: 'rgba(180,210,255,0.3)', fontSize: 13,
            whiteSpace: 'nowrap', borderRight: '1px solid rgba(100,180,255,0.12)',
            flexShrink: 0, fontFamily: 'SF Mono, Fira Code, monospace',
          }}>
            /i/
          </span>
          <input
            style={{
              background: 'transparent', border: 'none', color: 'white',
              padding: '12px 14px', fontSize: 14, outline: 'none', flex: 1,
              fontFamily: 'SF Mono, Fira Code, monospace',
            }}
            value={slug}
            onChange={e => handleSlugChange(e.target.value)}
            placeholder="mi-universidad"
            maxLength={30}
          />
        </div>
        {slug && slug.length >= 3 && (
          <p style={{ fontSize: 12, color: 'rgba(74,186,255,0.6)', marginTop: 8 }}>
            {APP_URL}/i/{slug}
          </p>
        )}
      </div>

      {/* Page active toggle */}
      <div className="glass-card" style={{ marginBottom: 20, padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#F0F8FF', marginBottom: 4 }}>
              Activar página pública
            </p>
            <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.45)' }}>
              Hace tu página visible para cualquier visitante
            </p>
          </div>
          <div
            onClick={() => set('page_active', !settings.page_active)}
            style={{ cursor: 'pointer', flexShrink: 0 }}
          >
            <div style={{
              width: 48, height: 26, borderRadius: 13,
              background: settings.page_active ? '#4ABAFF' : 'rgba(100,180,255,0.12)',
              border: `1px solid ${settings.page_active ? '#4ABAFF' : 'rgba(100,180,255,0.2)'}`,
              position: 'relative', transition: 'background 0.2s, border-color 0.2s',
            }}>
              <div style={{
                position: 'absolute', top: 3, left: settings.page_active ? 24 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: settings.page_active ? '#fff' : 'rgba(180,210,255,0.4)',
                transition: 'left 0.2s, background 0.2s',
              }} />
            </div>
          </div>
        </div>
        {settings.page_active && slug && (
          <a
            href={`/i/${slug}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, color: '#4ABAFF', fontSize: 13, textDecoration: 'none' }}
          >
            <ExternalLink size={12} /> {APP_URL}/i/{slug}
          </a>
        )}
      </div>

      {/* Content fields */}
      <div className="glass-card" style={{ marginBottom: 24, padding: '24px 28px' }}>
        <p style={{ fontWeight: 700, fontSize: 16, color: '#F0F8FF', marginBottom: 4 }}>Contenido de la página</p>
        <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.4)', marginBottom: 8 }}>
          Este texto aparecerá en tu página pública.
        </p>

        <label style={labelStyle}>Título principal</label>
        <input
          style={inputStyle}
          value={settings.page_headline}
          onChange={e => set('page_headline', e.target.value)}
          placeholder="Ej: Institución líder en certificación digital"
          maxLength={120}
        />

        <label style={labelStyle}>Subtítulo</label>
        <input
          style={inputStyle}
          value={settings.page_tagline}
          onChange={e => set('page_tagline', e.target.value)}
          placeholder="Ej: Emitimos credenciales verificables en blockchain"
          maxLength={200}
        />

        <label style={labelStyle}>Descripción (acerca de)</label>
        <textarea
          style={{ ...inputStyle, minHeight: 120, resize: 'vertical', lineHeight: 1.6 }}
          value={settings.page_about}
          onChange={e => set('page_about', e.target.value)}
          placeholder="Cuéntale al mundo quiénes son y qué hacen…"
          maxLength={600}
        />

        <label style={labelStyle}>Texto del botón principal</label>
        <input
          style={inputStyle}
          value={settings.page_cta}
          onChange={e => set('page_cta', e.target.value)}
          placeholder="Ver certificados"
          maxLength={50}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary"
        style={{ fontSize: 14, padding: '12px 32px' }}
      >
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}
