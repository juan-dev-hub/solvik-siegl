'use client'
import { useState, useEffect } from 'react'
import { Users, TrendingUp, Upload, ExternalLink } from 'lucide-react'
import Link from 'next/link'

type Creator = {
  display_name: string; slug: string; bio: string | null
  subscribers_count: number; monthly_volume_usdc: number; current_plan: string; storage_gb: number
}
type ContentItem = { id: string; title: string; created_at: string; is_premium: boolean; file_type: string }

export default function CreatorDashboardPage() {
  const [creator, setCreator]   = useState<Creator | null>(null)
  const [content, setContent]   = useState<ContentItem[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/creator/me').then(r => r.json()).then(d => {
      setCreator(d.creator ?? null)
      setContent(d.content ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'rgba(180,210,255,0.4)' }}>Cargando...</div>

  if (!creator) return (
    <div style={{ textAlign: 'center', padding: 64 }}>
      <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 20, color: '#F0F8FF', marginBottom: 16 }}>No tenés un canal activo</p>
      <Link href="/create" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>Activar canal →</Link>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 4 }}>{creator.display_name}</h1>
          <a href={`/create/${creator.slug}`} style={{ fontSize: 13, color: '#4ABAFF', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
            <ExternalLink size={13} /> /create/{creator.slug}
          </a>
        </div>
        <Link href="/dashboard/creator/upload" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <Upload size={16} /> Subir contenido
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { icon: <Users size={20} color="#4ABAFF" />, label: 'Suscriptores', value: creator.subscribers_count },
          { icon: <TrendingUp size={20} color="#00FFB3" />, label: 'Volumen mensual', value: `$${creator.monthly_volume_usdc.toFixed(2)}` },
          { label: 'Plan', value: creator.current_plan.toUpperCase(), color: '#FFD700' },
          { label: 'Storage', value: `${creator.storage_gb.toFixed(1)} GB` },
        ].map((s, i) => (
          <div key={i} className="glass-card">
            {s.icon && <div style={{ marginBottom: 8 }}>{s.icon}</div>}
            <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 22, color: (s as { color?: string }).color ?? '#F0F8FF' }}>{String(s.value)}</p>
            <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.45)', fontFamily: 'Luna, sans-serif' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(100,200,255,0.08)' }}>
          <h2 style={{ fontWeight: 700, fontSize: 18, color: '#F0F8FF' }}>Contenido publicado ({content.length})</h2>
        </div>
        {content.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(180,210,255,0.4)', fontFamily: 'Luna, sans-serif' }}>
            Aún no publicaste contenido. <Link href="/dashboard/creator/upload" style={{ color: '#4ABAFF' }}>Subir ahora →</Link>
          </div>
        ) : (
          content.map(item => (
            <div key={item.id} style={{ padding: '12px 24px', borderBottom: '1px solid rgba(100,200,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ color: '#F0F8FF', fontWeight: 500, fontSize: 14 }}>{item.title}</p>
                <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.4)', fontFamily: 'Luna, sans-serif' }}>
                  {item.file_type} · {new Date(item.created_at).toLocaleDateString('es-ES')}
                </p>
              </div>
              <span style={{ fontSize: 11, background: item.is_premium ? 'rgba(255,215,0,0.12)' : 'rgba(82,200,120,0.12)', color: item.is_premium ? '#FFD700' : '#52C878', border: `1px solid ${item.is_premium ? 'rgba(255,215,0,0.3)' : 'rgba(82,200,120,0.3)'}`, borderRadius: 20, padding: '3px 10px', fontFamily: 'Luna, sans-serif' }}>
                {item.is_premium ? 'Premium' : 'Público'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
