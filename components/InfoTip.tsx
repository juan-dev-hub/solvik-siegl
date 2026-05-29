'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'

interface InfoTipProps {
  title?: string
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  size?: number
}

const TIP_W = 230

export function InfoTip({ title, text, position = 'bottom', size = 13 }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const calcCoords = () => {
    if (!btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    if (position === 'bottom') setCoords({ top: r.bottom + 8,              left: r.left + r.width / 2 - TIP_W / 2 })
    else if (position === 'top')   setCoords({ top: r.top - 8,             left: r.left + r.width / 2 - TIP_W / 2 })
    else if (position === 'right') setCoords({ top: r.top + r.height / 2,  left: r.right + 8 })
    else                           setCoords({ top: r.top + r.height / 2,  left: r.left - TIP_W - 8 })
  }

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 150)
  }, [])

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  const handleEnter = () => { cancelClose(); calcCoords(); setOpen(true) }
  const handleLeave = () => scheduleClose()

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!btnRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    window.addEventListener('scroll', () => setOpen(false), { once: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [open])

  const translateY = (position === 'right' || position === 'left') ? '-50%' : position === 'top' ? '-100%' : '0'

  // Clamp tooltip so it doesn't go off-screen left
  const clampedLeft = Math.max(8, coords.left)

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <button
        ref={btnRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onClick={e => { e.preventDefault(); e.stopPropagation(); if (open) { setOpen(false) } else { calcCoords(); setOpen(true) } }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 3,
          display: 'flex', alignItems: 'center',
          color: 'rgba(74,186,255,0.5)', transition: 'color 0.15s',
        }}
      >
        <Info size={size} />
      </button>

      {open && typeof window !== 'undefined' && createPortal(
        <div
          onMouseEnter={cancelClose}
          onMouseLeave={handleLeave}
          style={{
            position: 'fixed',
            top: coords.top,
            left: clampedLeft,
            transform: `translateY(${translateY})`,
            width: TIP_W,
            background: 'rgba(5,15,50,0.98)',
            border: '1px solid rgba(74,186,255,0.25)',
            borderRadius: 10,
            padding: '10px 13px',
            zIndex: 99999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            pointerEvents: 'auto',
          }}
        >
          {title && <p style={{ fontWeight: 700, fontSize: 12, color: '#4ABAFF', marginBottom: 5, margin: '0 0 5px' }}>{title}</p>}
          <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.8)', lineHeight: 1.6, margin: 0 }}>{text}</p>
        </div>,
        document.body
      )}
    </div>
  )
}
