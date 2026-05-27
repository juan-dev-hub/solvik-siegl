'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/components/LanguageProvider'

const TIMEOUT_MS  = 10 * 60 * 1000  // 10 minutes
const WARN_MS     =  8 * 60 * 1000  // warn 2 min before logout
const WARN_SECS   = (TIMEOUT_MS - WARN_MS) / 1000  // 120 seconds

export function InactivityTimer() {
  const router = useRouter()
  const { t } = useTranslation()
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const routerRef    = useRef(router)
  const [showWarn, setShowWarn]       = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARN_SECS)

  // Keep routerRef current without triggering effect re-runs
  useEffect(() => { routerRef.current = router }, [router])

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = null
  }, [])

  // reset has no router dependency — stable across navigations
  const reset = useCallback(() => {
    setShowWarn(false)
    setSecondsLeft(WARN_SECS)
    stopCountdown()
    if (timerRef.current) clearTimeout(timerRef.current)
    if (warnRef.current)  clearTimeout(warnRef.current)

    warnRef.current = setTimeout(() => {
      setShowWarn(true)
      setSecondsLeft(WARN_SECS)
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) { stopCountdown(); return 0 }
          return s - 1
        })
      }, 1000)
    }, WARN_MS)

    timerRef.current = setTimeout(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
      routerRef.current.push('/')
    }, TIMEOUT_MS)
  }, [stopCountdown])

  useEffect(() => {
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      if (timerRef.current) clearTimeout(timerRef.current)
      if (warnRef.current)  clearTimeout(warnRef.current)
      stopCountdown()
    }
  }, [reset, stopCountdown])

  if (!showWarn) return null

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: 'rgba(5,15,45,0.95)', backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,180,50,0.5)', borderRadius: 16,
      padding: '20px 24px', maxWidth: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontFamily: 'Luna, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <span style={{ fontSize: 13, color: '#FFD580', fontWeight: 600 }}>
          {t.inactivity.warning}
        </span>
      </div>
      <div style={{
        fontSize: 36, fontWeight: 800, color: secondsLeft <= 30 ? '#FF6B6B' : '#FFD580',
        letterSpacing: 2, textAlign: 'center', marginBottom: 14,
        transition: 'color 0.3s',
      }}>
        {timeStr}
      </div>
      <button
        onClick={reset}
        style={{
          width: '100%', padding: '9px 0', borderRadius: 10, border: 'none',
          background: 'rgba(255,213,128,0.15)', color: '#FFD580',
          fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'Luna, sans-serif', transition: 'background 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,213,128,0.28)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,213,128,0.15)')}
      >
        {t.inactivity.stay}
      </button>
    </div>
  )
}
