'use client'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

interface InfoTipProps {
  title?: string
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  size?: number
}

export function InfoTip({ title, text, position = 'bottom', size = 13 }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  const calcCoords = () => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const TIP_W = 230
    if (position === 'bottom') setCoords({ top: r.bottom + 8, left: r.left + r.width / 2 - TIP_W / 2 })
    else if (position === 'top') setCoords({ top: r.top - 8, left: r.left + r.width / 2 - TIP_W / 2 })
    else if (position === 'right') setCoords({ top: r.top + r.height / 2, left: r.right + 8 })
    else setCoords({ top: r.top + r.height / 2, left: r.left - TIP_W - 8 })
  }

  const handleOpen = () => { calcCoords(); setOpen(true) }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (!btnRef.current?.contains(t) && !tipRef.current?.contains(t)) setOpen(false)
    }
    const scroll = () => setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    window.addEventListener('scroll', scroll, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [open])

  const translateY = position === 'right' || position === 'left' ? '-50%' : position === 'top' ? '-100%' : '0'

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <button
        ref={btnRef}
        onMouseEnter={handleOpen}
        onMouseLeave={() => setOpen(false)}
        onClick={e => { e.preventDefault(); e.stopPropagation(); open ? setOpen(false) : handleOpen() }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          display: 'flex', alignItems: 'center',
          color: 'rgba(74,186,255,0.45)', transition: 'color 0.15s',
        }}
      >
        <Info size={size} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={tipRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: `translateY(${translateY})`,
            width: 230,
            background: 'rgba(5,15,50,0.97)',
            border: '1px solid rgba(74,186,255,0.2)',
            borderRadius: 10,
            padding: '10px 13px',
            zIndex: 9999,
            boxShadow: '0 8px 28px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}
        >
          {title && <p style={{ fontWeight: 700, fontSize: 12, color: '#4ABAFF', marginBottom: 5 }}>{title}</p>}
          <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.75)', lineHeight: 1.6, margin: 0 }}>{text}</p>
        </div>,
        document.body
      )}
    </div>
  )
}
