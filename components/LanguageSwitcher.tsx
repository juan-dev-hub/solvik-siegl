'use client'
import { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { useTranslation } from '@/components/LanguageProvider'
import { LOCALES, Locale } from '@/lib/i18n'

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = LOCALES.find(l => l.code === locale)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'rgba(0,50,120,0.3)', border: '1px solid rgba(100,200,255,0.2)', borderRadius: 8, padding: '6px 12px', color: 'rgba(180,210,255,0.8)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'Luna, sans-serif' }}
      >
        <Globe size={14} />
        {current?.flag} {current?.code.toUpperCase()}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '110%', background: 'rgba(0,20,60,0.95)', border: '1px solid rgba(100,200,255,0.2)', borderRadius: 10, padding: 4, zIndex: 100, minWidth: 140, backdropFilter: 'blur(20px)' }}>
          {LOCALES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLocale(l.code as Locale); setOpen(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: locale === l.code ? 'rgba(74,186,255,0.15)' : 'transparent', border: 'none', color: locale === l.code ? '#4ABAFF' : 'rgba(180,210,255,0.7)', cursor: 'pointer', fontSize: 13, fontFamily: 'Luna, sans-serif', borderRadius: 6 }}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
