'use client'
import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

interface InfoTipProps {
  title?: string
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  size?: number
}

export function InfoTip({ title, text, position = 'bottom', size = 13 }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  const posStyle: React.CSSProperties =
    position === 'bottom' ? { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' } :
    position === 'top'    ? { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' } :
    position === 'right'  ? { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' } :
                            { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(v => !v) }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          display: 'flex', alignItems: 'center',
          color: 'rgba(74,186,255,0.45)', transition: 'color 0.15s',
        }}
      >
        <Info size={size} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', ...posStyle,
          width: 230, background: 'rgba(5,15,50,0.97)',
          border: '1px solid rgba(74,186,255,0.2)', borderRadius: 10,
          padding: '10px 13px', zIndex: 600,
          boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
        }}>
          {title && (
            <p style={{ fontWeight: 700, fontSize: 12, color: '#4ABAFF', marginBottom: 5 }}>{title}</p>
          )}
          <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.75)', lineHeight: 1.6, margin: 0 }}>{text}</p>
        </div>
      )}
    </div>
  )
}
