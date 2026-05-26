'use client'
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
  duration: number
}

interface ToastContextValue {
  success: (title: string, message?: string) => void
  error:   (title: string, message?: string) => void
  info:    (title: string, message?: string) => void
}

const ToastCtx = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be within ToastProvider')
  return ctx
}

const CONFIG: Record<ToastType, { border: string; glow: string; duration: number }> = {
  success: { border: '#00D4FF', glow: 'rgba(0,212,255,0.15)',   duration: 5000 },
  error:   { border: '#FF4D6A', glow: 'rgba(255,77,106,0.15)',  duration: 8000 },
  info:    { border: '#B06FFF', glow: 'rgba(176,111,255,0.15)', duration: 6000 },
}

function SingleToast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const cfg = CONFIG[item.type]
  const Icon = item.type === 'success' ? CheckCircle : item.type === 'error' ? AlertCircle : Info
  const [progress, setProgress] = useState(100)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current
      setProgress(Math.max(0, 100 - (elapsed / item.duration) * 100))
    }, 60)
    return () => clearInterval(id)
  }, [item.duration])

  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      background: `linear-gradient(135deg, rgba(10,0,21,0.95) 0%, ${cfg.glow} 100%)`,
      border: `1px solid ${cfg.border}35`,
      borderLeft: `3px solid ${cfg.border}`,
      borderRadius: 14,
      padding: '14px 14px 20px 16px',
      width: 340,
      backdropFilter: 'blur(28px)',
      boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.border}18, 0 0 20px ${cfg.border}15`,
      animation: 'toast-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
    }}>
      <Icon size={18} color={cfg.border} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#F0F0FF', lineHeight: 1.4, margin: 0 }}>
          {item.title}
        </p>
        {item.message && (
          <p style={{ fontSize: 12, color: 'rgba(240,240,255,0.55)', lineHeight: 1.6, margin: '5px 0 0' }}>
            {item.message}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,255,0.28)', padding: '2px', flexShrink: 0, lineHeight: 1, transition: 'color 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(240,240,255,0.7)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(240,240,255,0.28)')}
      >
        <X size={14} />
      </button>
      {/* Draining progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 2,
        width: `${progress}%`,
        background: `linear-gradient(90deg, ${cfg.border}80, ${cfg.border})`,
        transition: 'width 0.06s linear',
      }} />
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2, 10)
    const duration = CONFIG[type].duration
    setToasts(prev => [...prev, { id, type, title, message, duration }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const ctx: ToastContextValue = {
    success: (title, message) => add('success', title, message),
    error:   (title, message) => add('error',   title, message),
    info:    (title, message) => add('info',    title, message),
  }

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <SingleToast item={t} onDismiss={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}
