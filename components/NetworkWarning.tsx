'use client'
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

export function NetworkWarning({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(5,15,50,0.97)', backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,165,0,0.35)', borderRadius: 10,
          padding: '12px 16px', width: 300, zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertTriangle size={15} color="#FFB347" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: 'rgba(240,240,255,0.8)', lineHeight: 1.6, fontFamily: 'Luna, sans-serif', margin: 0 }}>
              ⚠️ Solo operamos en la red de Solana con USDC nativo. Usá USDC de Solana, no de Ethereum ni otras redes. Fondos enviados por otras redes no pueden recuperarse.
            </p>
          </div>
          <div style={{ position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)', width: 10, height: 10, background: 'rgba(5,15,50,0.97)', border: '1px solid rgba(255,165,0,0.35)', borderTop: 'none', borderLeft: 'none', rotate: '45deg' }} />
        </div>
      )}
    </div>
  )
}
