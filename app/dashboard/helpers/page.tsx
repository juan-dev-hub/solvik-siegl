'use client'
import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Loader2, Users } from 'lucide-react'
import { InfoTip } from '@/components/InfoTip'

export default function HelpersPage() {
  const [helpers, setHelpers]       = useState<string[]>([])
  const [maxHelpers, setMaxHelpers] = useState(3)
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [adding, setAdding]         = useState(false)
  const [removing, setRemoving]     = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/helpers')
      .then(r => r.json())
      .then(d => {
        setHelpers(d.helpers ?? [])
        setMaxHelpers(d.max_helpers ?? 3)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!input.trim()) return
    setAdding(true)
    setError(null)
    try {
      const res = await fetch('/api/helpers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helper_wallet: input.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setHelpers(data.helpers)
      setInput('')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (hw: string) => {
    setRemoving(hw)
    try {
      const res = await fetch('/api/helpers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helper_wallet: hw }),
      })
      const data = await res.json()
      if (res.ok) setHelpers(data.helpers)
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <h1 style={{ fontWeight: 800, fontSize: 28, color: '#F0F8FF', margin: 0 }}>
          Ayudantes
        </h1>
        <InfoTip
          title="¿Qué es un ayudante?"
          text="Un ayudante puede conectar su propia wallet y emitir certificados bajo tu identidad como issuer. Tú seguís siendo el titular — ellos solo operan en tu nombre. No compartas acceso con personas en las que no confíes plenamente: los certificados quedan firmados bajo tu reputación."
          position="right"
          size={15}
        />
      </div>
      <p style={{ color: 'rgba(180,210,255,0.5)', fontSize: 14, marginBottom: 36 }}>
        Autorizá hasta {maxHelpers} wallets para que emitan certificados bajo tu cuenta. El certificado siempre queda firmado como tuyo.
      </p>

      {/* Lista actual */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <Users size={16} color="#4ABAFF" />
          <span style={{ fontWeight: 700, fontSize: 15, color: '#F0F8FF' }}>
            Colaboradores activos ({helpers.length}/{maxHelpers})
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(180,210,255,0.4)', fontSize: 13 }}>
            <Loader2 size={14} className="animate-spin" /> Cargando...
          </div>
        ) : helpers.length === 0 ? (
          <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.35)', fontStyle: 'italic' }}>
            Ninguna wallet autorizada todavía.
          </p>
        ) : (
          helpers.map(hw => (
            <div
              key={hw}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 10, marginBottom: 8,
                background: 'rgba(74,186,255,0.05)', border: '1px solid rgba(74,186,255,0.12)',
              }}
            >
              <span style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 12, color: 'rgba(180,210,255,0.8)', wordBreak: 'break-all' }}>
                {hw}
              </span>
              <button
                onClick={() => handleRemove(hw)}
                disabled={removing === hw}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,100,100,0.6)', padding: '4px 8px', flexShrink: 0, marginLeft: 12 }}
              >
                {removing === hw ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Agregar */}
      {helpers.length < maxHelpers && (
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <UserPlus size={16} color="#00FFB3" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#F0F8FF' }}>
              Agregar colaborador
            </span>
          </div>

          <div style={{ background: 'rgba(255,180,50,0.06)', border: '1px solid rgba(255,180,50,0.18)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'rgba(255,200,80,0.8)', lineHeight: 1.6 }}>
            Solo autorizá wallets de personas de confianza. Cualquier certificado que emitan quedará asociado a tu identidad como issuer. Solvik Studio no puede revertir certificados emitidos.
          </div>

          <label style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
            Dirección pública (Public Key) de la wallet
          </label>
          <input
            value={input}
            onChange={e => { setInput(e.target.value); setError(null) }}
            placeholder="Ej: 7xKXtg..."
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{ marginBottom: 12, fontFamily: 'SF Mono, Fira Code, monospace', fontSize: 13 }}
          />

          {error && (
            <p style={{ fontSize: 12, color: 'rgba(255,100,100,0.8)', marginBottom: 12 }}>{error}</p>
          )}

          <button
            className="btn-primary"
            onClick={handleAdd}
            disabled={adding || !input.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Autorizar wallet
          </button>
        </div>
      )}

      {helpers.length >= maxHelpers && (
        <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.35)', marginTop: 8 }}>
          Límite de {maxHelpers} colaboradores alcanzado. Eliminá uno para agregar otro.
        </p>
      )}
    </div>
  )
}
