'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const STEPS = [
  {
    num: '1', color: '#00FFB3',
    title: 'Emití tu primer certificado',
    desc: 'Subí un PDF con el diploma y completá el nombre del destinatario. En segundos queda en Arweave y Solana.',
    href: '/dashboard/new',
  },
  {
    num: '2', color: '#4ABAFF',
    title: 'Configurá tu página pública',
    desc: 'Tu vitrina online. Cualquier persona puede entrar y verificar los certificados que emitiste.',
    href: '/dashboard/page-settings',
  },
  {
    num: '3', color: '#B06FFF',
    title: 'Verificá tu dominio .sol',
    desc: 'Conectá tu dominio de Solana Name Service para que tu institución aparezca como verificada.',
    href: '/dashboard/sns',
  },
]

export function OnboardingCard() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('solvik_onboarding_v1')) setVisible(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem('solvik_onboarding_v1', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="glass-card" style={{ marginBottom: 32, border: '1px solid rgba(74,186,255,0.18)', background: 'rgba(74,186,255,0.03)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: 16, color: '#F0F8FF', marginBottom: 4 }}>
            👋 Bienvenido a Solvik Studio
          </p>
          <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.45)' }}>
            Seguí estos pasos y en minutos ya estás emitiendo.
          </p>
        </div>
        <button
          onClick={dismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(180,210,255,0.3)', padding: 4, display: 'flex' }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
        {STEPS.map(step => (
          <a
            key={step.num}
            href={step.href}
            style={{
              textDecoration: 'none', padding: '13px 15px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              display: 'block', transition: 'border-color 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <span style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: `${step.color}18`, color: step.color,
                fontSize: 11, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{step.num}</span>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#F0F8FF', margin: 0 }}>{step.title}</p>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.45)', lineHeight: 1.55, margin: 0, paddingLeft: 30 }}>
              {step.desc}
            </p>
          </a>
        ))}
      </div>

      <button
        onClick={dismiss}
        style={{ fontSize: 12, color: 'rgba(180,210,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        Ya sé cómo funciona →
      </button>
    </div>
  )
}
