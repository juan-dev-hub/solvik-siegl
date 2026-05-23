'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/LanguageProvider'

const TIMEOUT_MS = 20 * 60 * 1000
const WARN_MS    = 18 * 60 * 1000

export function InactivityTimer() {
  const router = useRouter()
  const { t } = useTranslation()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showWarn, setShowWarn] = useState(false)

  const reset = useCallback(() => {
    setShowWarn(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (warnRef.current)  clearTimeout(warnRef.current)

    warnRef.current = setTimeout(() => setShowWarn(true), WARN_MS)
    timerRef.current = setTimeout(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    }, TIMEOUT_MS)
  }, [router])

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      if (timerRef.current) clearTimeout(timerRef.current)
      if (warnRef.current)  clearTimeout(warnRef.current)
    }
  }, [reset])

  if (!showWarn) return null

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'rgba(255,229,102,0.15)', border: '1px solid #FFE566', borderRadius: 12, padding: '12px 20px', color: '#FFE566', fontSize: 13, fontFamily: 'Inter, sans-serif', zIndex: 9999, backdropFilter: 'blur(20px)', maxWidth: 320 }}>
      ⚠ {t.inactivity.warning}
    </div>
  )
}
