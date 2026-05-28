'use client'
import { useState, useEffect, useRef } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useTranslation } from '@/components/LanguageProvider'
import { useToast } from '@/components/ToastProvider'

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

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
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
  const toast = useToast()
  const [loading, setLoading]             = useState(false)
  const [hasSession, setHasSession]       = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [altchaToken, setAltchaToken]     = useState<string | null>(null)
  const [altchaReady, setAltchaReady]     = useState(false)
  const [iosNoProvider, setIosNoProvider] = useState(false)
  const widgetRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const active = document.cookie.includes('session_active=1')
    setHasSession(active)
    if (active) {
      const p = getProvider()
      if (p?.publicKey) setWalletAddress(getAddress(p.publicKey))
    }
    // On iOS Safari, wallet extensions don't exist — need wallet's in-app browser
    if (isIOS() && !getProvider()) setIosNoProvider(true)
  }, [])

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
    }, 500)

    return () => clearInterval(poll)
  }, [hasSession])

  const handleConnect = async () => {
    if (!altchaToken) {
      toast.error('Verificación requerida', 'Completa el captcha antes de conectar tu wallet.')
      return
    }

    setLoading(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    try {
      const provider = getProvider()
      if (!provider) {
        toast.error('Wallet no encontrada', t.common.install_wallet)
        return
      }

      const connectResult = await provider.connect()
      const rawKey = (connectResult as { publicKey?: unknown })?.publicKey ?? provider.publicKey
      const address = getAddress(rawKey)
      if (!address) {
        toast.error('Error de wallet', t.common.wallet_no_address)
        return
      }
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
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        toast.error('Error de autenticación', data.error ?? t.common.server_error)
        return
      }

      setHasSession(true)
      window.location.href = '/dashboard'
    } catch (e: unknown) {
      clearTimeout(timeoutId)
      if (e instanceof Error) {
        if (e.name === 'AbortError') {
          toast.error(
            'Tiempo de espera agotado',
            'El servidor no respondió en 30 segundos. Verifica tu conexión e inténtalo de nuevo.'
          )
        } else if (e.message.toLowerCase().includes('rejected') || e.message.toLowerCase().includes('cancel')) {
          toast.info('Cancelado', 'Rechazaste la firma en tu wallet.')
        } else {
          toast.error('Error de conexión', e.message)
        }
      }
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

  // iOS Safari: wallet extensions don't exist — must open from inside the wallet browser
  if (iosNoProvider) {
    const url = typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : ''
    const solflareDeepLink = `https://solflare.com/ul/v1/browse/${url}?ref=${url}`
    const phantomDeepLink  = `https://phantom.app/ul/browse/${url}?ref=${url}`
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 300, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.6)', lineHeight: 1.5 }}>
          En iOS, abrí esta página desde el navegador de tu wallet:
        </p>
        <a
          href={solflareDeepLink}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', fontSize: 14 }}
        >
          Abrir en Solflare
        </a>
        <a
          href={phantomDeepLink}
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', fontSize: 14, background: 'linear-gradient(180deg, rgba(171,105,255,0.95) 0%, rgba(103,47,255,1) 50%, rgba(64,0,204,1) 100%)' }}
        >
          Abrir en Phantom
        </a>
        <p style={{ fontSize: 11, color: 'rgba(180,210,255,0.35)', lineHeight: 1.4 }}>
          Una vez dentro del navegador de la wallet, recargá la página y conectá normalmente.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {/* @ts-expect-error — altcha is a custom web component */}
      <altcha-widget
        id="altcha-widget-main"
        challengeurl="/api/altcha"
        style={{ '--altcha-max-width': '280px' } as React.CSSProperties}
      />

      {altchaToken ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#00FFB3' }}>
          <ShieldCheck size={14} />
          Verificado
        </div>
      ) : altchaReady ? (
        <p style={{ fontSize: 11, color: 'rgba(240,240,255,0.4)' }}>
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
    </div>
  )
}
