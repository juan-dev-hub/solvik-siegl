'use client'
import { useState, useEffect, useRef } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useTranslation } from '@/components/LanguageProvider'

type SolanaProvider = {
  isSolflare?: boolean
  isPhantom?: boolean
  publicKey?: unknown
  connect(): Promise<{ publicKey: unknown }>
  disconnect(): Promise<void>
  signMessage(msg: Uint8Array, encoding?: string): Promise<{ signature: Uint8Array } | Uint8Array>
}

function getProvider(): SolanaProvider | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  const sf = w.solflare as SolanaProvider | undefined
  if (sf?.isSolflare) return sf
  const ph = (w.phantom as { solana?: SolanaProvider } | undefined)?.solana
  if (ph?.isPhantom) return ph
  const sol = w.solana as SolanaProvider | undefined
  if (sol && typeof sol.connect === 'function') return sol
  return null
}

function isValidSolanaAddress(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)
}

function getAddress(publicKey: unknown): string | null {
  if (!publicKey) return null
  if (typeof publicKey === 'string' && isValidSolanaAddress(publicKey)) return publicKey
  const pk = publicKey as { toBase58?: () => string; toString?: () => string }
  if (typeof pk.toBase58 === 'function') {
    const addr = pk.toBase58()
    if (addr && isValidSolanaAddress(addr)) return addr
  }
  if (typeof pk.toString === 'function') {
    const addr = pk.toString()
    if (addr && isValidSolanaAddress(addr)) return addr
  }
  return null
}

function truncate(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

export function WalletAuthButton() {
  const { t } = useTranslation()
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [hasSession, setHasSession]     = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [altchaToken, setAltchaToken]   = useState<string | null>(null)
  const [altchaReady, setAltchaReady]   = useState(false)
  const widgetRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const active = document.cookie.includes('session_active=1')
    setHasSession(active)
    if (active) {
      const p = getProvider()
      if (p?.publicKey) setWalletAddress(getAddress(p.publicKey))
    }
  }, [])

  // Load altcha web component script once, then wire up the event listener
  useEffect(() => {
    if (hasSession) return

    const scriptId = 'altcha-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js'
      script.type = 'module'
      document.head.appendChild(script)
    }

    // Poll until the web component is defined, then attach listener
    const poll = setInterval(() => {
      const el = document.getElementById('altcha-widget-main')
      if (el) {
        widgetRef.current = el as HTMLElement
        el.addEventListener('statechange', (e: Event) => {
          const detail = (e as CustomEvent<{ state: string; payload?: string }>).detail
          if (detail?.state === 'verified' && detail.payload) {
            setAltchaToken(detail.payload)
          }
        })
        setAltchaReady(true)
        clearInterval(poll)
      }
    }, 200)

    return () => clearInterval(poll)
  }, [hasSession])

  const handleConnect = async () => {
    setError(null)

    if (!altchaToken) {
      setError('Completa la verificación ☝️ antes de conectar.')
      return
    }

    setLoading(true)
    try {
      const provider = getProvider()
      if (!provider) { setError(t.common.install_wallet); return }
      const connectResult = await provider.connect()
      const rawKey = (connectResult as { publicKey?: unknown })?.publicKey ?? provider.publicKey
      const address = getAddress(rawKey)
      if (!address) { setError(t.common.wallet_no_address); return }
      setWalletAddress(address)

      const timestamp = Date.now()
      const message = `Autenticar en Solvik Studio: ${address} ${timestamp}`
      const encoded = new TextEncoder().encode(message)
      const result = await provider.signMessage(encoded, 'utf8')
      const sigBytes = result instanceof Uint8Array ? result : (result as { signature: Uint8Array }).signature

      const res = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-altcha-payload': altchaToken,
        },
        body: JSON.stringify({ wallet_address: address, message, signature: Array.from(sigBytes) }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) { setError(data.error ?? t.common.server_error); return }
      setHasSession(true)
      setError(null)
      window.location.href = '/dashboard'
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(
        msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('cancel')
          ? t.common.cancelled
          : 'Error: ' + msg
      )
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    try { await getProvider()?.disconnect() } catch { /* ignore */ }
    setHasSession(false)
    setWalletAddress(null)
    window.location.href = '/'
  }

  if (hasSession) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="/dashboard" className="btn-primary">{t.common.dashboard}</a>
        {walletAddress && <span className="wallet-address">{truncate(walletAddress)}</span>}
        <button className="btn-secondary" onClick={handleLogout}>{t.common.disconnect}</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {/* Altcha widget — always visible when not authenticated */}
      {/* @ts-expect-error — altcha is a custom web component */}
      <altcha-widget
        id="altcha-widget-main"
        challengeurl="/api/altcha"
        style={{ '--altcha-max-width': '280px' } as React.CSSProperties}
      />

      {altchaToken ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#00FFB3', fontFamily: 'Luna, sans-serif' }}>
          <ShieldCheck size={14} />
          Verificado
        </div>
      ) : altchaReady ? (
        <p style={{ fontSize: 11, color: 'rgba(240,240,255,0.4)', fontFamily: 'Luna, sans-serif' }}>
          Completa la verificación para continuar
        </p>
      ) : null}

      {loading ? (
        <button className="btn-primary" disabled>
          <Loader2 size={16} className="animate-spin" />
          {t.common.connecting}
        </button>
      ) : (
        <button
          className="btn-primary"
          onClick={handleConnect}
          style={{ opacity: altchaToken ? 1 : 0.6 }}
        >
          {t.common.connect}
        </button>
      )}

      {error && (
        <p style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center', maxWidth: 280, fontFamily: 'Luna, sans-serif' }}>
          {error}
        </p>
      )}
    </div>
  )
}
