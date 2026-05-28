'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSessionGuard } from '@/hooks/useSessionGuard'
import { Loader2, ShieldCheck, AlertTriangle, ScanQrCode, Info } from 'lucide-react'
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

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
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

// ---------------------------------------------------------------------------
// Tooltip de ayuda para el botón QR
// ---------------------------------------------------------------------------
function QrInfoTooltip() {
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

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(74,186,255,0.5)', display: 'flex', alignItems: 'center' }}
      >
        <Info size={16} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
          width: 240, background: 'rgba(5,15,50,0.97)',
          border: '1px solid rgba(74,186,255,0.2)', borderRadius: 10,
          padding: '12px 14px', zIndex: 600,
          boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
        }}>
          <p style={{ fontWeight: 700, fontSize: 12, color: '#4ABAFF', marginBottom: 6 }}>¿Cómo funciona?</p>
          <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.75)', lineHeight: 1.6, margin: 0 }}>
            Iniciá sesión desde tu computadora, entrá al dashboard y usá el botón <strong style={{ color: '#F0F8FF' }}>Abrir en móvil</strong> para obtener el código QR.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// QR Scanner (mobile only)
// ---------------------------------------------------------------------------
function QrScannerModal({ onClose, onResult }: { onClose: () => void; onResult: (url: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState('')
  const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window

  // Start camera stream
  useEffect(() => {
    if (!hasBarcodeDetector) return
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      })
      .catch(() => setCameraError('No se pudo acceder a la cámara. Permitile el acceso e intentá de nuevo.'))
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [hasBarcodeDetector])

  // Scan loop
  useEffect(() => {
    if (!hasBarcodeDetector) return
    const video = videoRef.current
    if (!video) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
    let rafId: number
    let done = false

    const scan = async () => {
      if (done) return
      if (video.readyState >= 2) {
        try {
          const results = await detector.detect(video)
          if (results.length > 0 && results[0].rawValue) {
            done = true
            streamRef.current?.getTracks().forEach(t => t.stop())
            onResult(results[0].rawValue)
            return
          }
        } catch { /* keep scanning */ }
      }
      rafId = requestAnimationFrame(scan)
    }

    const onPlay = () => { rafId = requestAnimationFrame(scan) }
    video.addEventListener('playing', onPlay)
    return () => {
      done = true
      cancelAnimationFrame(rafId)
      video.removeEventListener('playing', onPlay)
    }
  }, [hasBarcodeDetector, onResult])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
      zIndex: 300, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'rgba(10,5,30,0.98)', border: '1px solid rgba(74,186,255,0.25)',
        borderRadius: 16, padding: 24, maxWidth: 340, width: '100%',
      }}>
        <p style={{ fontWeight: 700, fontSize: 16, color: '#F0F8FF', marginBottom: 4 }}>
          Escanear QR de sesión
        </p>
        <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.45)', marginBottom: 16, lineHeight: 1.5 }}>
          Apuntá la cámara al código QR que aparece en el dashboard de tu computadora.
        </p>

        {hasBarcodeDetector ? (
          cameraError ? (
            <p style={{ color: '#FF6B6B', fontSize: 13, lineHeight: 1.5 }}>{cameraError}</p>
          ) : (
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: '100%', display: 'block', aspectRatio: '1', objectFit: 'cover' }}
              />
              {/* Viewfinder corners */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(corner => {
                  const isTop = corner.includes('top')
                  const isLeft = corner.includes('left')
                  return (
                    <div key={corner} style={{
                      position: 'absolute',
                      [isTop ? 'top' : 'bottom']: 20,
                      [isLeft ? 'left' : 'right']: 20,
                      width: 28, height: 28,
                      borderTop: isTop ? '3px solid #4ABAFF' : 'none',
                      borderBottom: !isTop ? '3px solid #4ABAFF' : 'none',
                      borderLeft: isLeft ? '3px solid #4ABAFF' : 'none',
                      borderRight: !isLeft ? '3px solid #4ABAFF' : 'none',
                    }} />
                  )
                })}
              </div>
            </div>
          )
        ) : (
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,200,100,0.85)', marginBottom: 12, lineHeight: 1.5 }}>
              Tu navegador no soporta el escáner automático. Pegá la URL del código QR de tu computadora:
            </p>
            <input
              value={manualUrl}
              onChange={e => setManualUrl(e.target.value)}
              placeholder="https://www.solvikstudio.com/api/auth/..."
              style={{ fontSize: 13, marginBottom: 10 }}
            />
            <button
              className="btn-primary"
              style={{ width: '100%', fontSize: 13, justifyContent: 'center' }}
              onClick={() => manualUrl.trim() && onResult(manualUrl.trim())}
            >
              Continuar
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 16, width: '100%', background: 'none', border: 'none',
            color: 'rgba(180,210,255,0.4)', cursor: 'pointer', fontSize: 13, padding: '8px 0',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function WalletAuthButton({ showWidget = false }: { showWidget?: boolean }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [loading, setLoading]             = useState(false)
  const [hasSession, setHasSession]       = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [altchaToken, setAltchaToken]     = useState<string | null>(null)
  const [altchaReady, setAltchaReady]     = useState(false)
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [mobileNoWallet, setMobileNoWallet] = useState(false)
  const [showTooltip, setShowTooltip]     = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const widgetRef  = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const active = document.cookie.includes('session_active=1')
    setHasSession(active)
    if (active) {
      const p = getProvider()
      if (p?.publicKey) setWalletAddress(getAddress(p.publicKey))
    }
    // Any mobile device → use QR flow (avoids wallet extension popups on Android/iOS)
    if (isMobileDevice()) setMobileNoWallet(true)
  }, [])

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showTooltip) return
    const handler = (e: MouseEvent | TouchEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [showTooltip])

  // Load ALTCHA script only when this instance owns the widget
  useEffect(() => {
    if (hasSession || mobileNoWallet || !showWidget) return
    const scriptId = 'altcha-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js'
      script.type = 'module'
      document.head.appendChild(script)
    }
  }, [hasSession, mobileNoWallet, showWidget])

  // Both instances listen to the same widget (rendered by the hero button)
  useEffect(() => {
    if (hasSession || mobileNoWallet) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ state: string; payload?: string }>).detail
      if (detail?.state === 'verified' && detail.payload) setAltchaToken(detail.payload)
    }
    const poll = setInterval(() => {
      const el = document.getElementById('altcha-widget-main')
      if (el) {
        widgetRef.current = el as HTMLElement
        el.addEventListener('statechange', handler)
        setAltchaReady(true)
        clearInterval(poll)
      }
    }, 500)
    return () => {
      clearInterval(poll)
      widgetRef.current?.removeEventListener('statechange', handler)
    }
  }, [hasSession, mobileNoWallet])

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
        headers: { 'Content-Type': 'application/json', 'x-altcha-payload': altchaToken },
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
          toast.error('Tiempo de espera agotado', 'El servidor no respondió en 30 segundos.')
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

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    try { await getProvider()?.disconnect() } catch { /* ignore */ }
    setHasSession(false)
    setWalletAddress(null)
    window.location.href = '/'
  }, [])

  // WebSocket: si otro dispositivo inicia sesión, cerrar aquí también
  useSessionGuard(hasSession ? walletAddress : null, handleLogout)

  const handleQrResult = (url: string) => {
    setShowQrScanner(false)
    window.location.href = url
  }

  // Logged in
  if (hasSession) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="/dashboard" className="btn-primary">{t.common.dashboard}</a>
        {walletAddress && <span className="wallet-address">{truncate(walletAddress)}</span>}
        <button className="btn-secondary" onClick={handleLogout}>{t.common.disconnect}</button>
      </div>
    )
  }

  // Mobile without wallet — QR flow
  if (mobileNoWallet) {
    return (
      <>
        {showQrScanner && (
          <QrScannerModal
            onClose={() => setShowQrScanner(false)}
            onResult={handleQrResult}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="btn-primary"
            onClick={() => setShowQrScanner(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <ScanQrCode size={18} />
            Escanear QR de sesión
          </button>
          <QrInfoTooltip />
        </div>
      </>
    )
  }

  // Desktop / mobile with wallet — normal flow
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {showWidget && (
        <>
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
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

        {/* Warning tooltip */}
        <div ref={tooltipRef} style={{ position: 'relative' }}>
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(v => !v)}
            aria-label="Advertencia sobre wallets"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,200,50,0.7)', padding: 4, display: 'flex',
              alignItems: 'center', borderRadius: 6, transition: 'color 0.15s',
            }}
          >
            <AlertTriangle size={18} />
          </button>

          {showTooltip && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              width: 300, background: 'rgba(10,5,30,0.97)',
              border: '1px solid rgba(255,200,50,0.3)', borderRadius: 12,
              padding: '14px 16px', zIndex: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              fontSize: 12, color: 'rgba(240,240,255,0.75)', lineHeight: 1.6,
            }}>
              {/* Flecha arriba */}
              <div style={{
                position: 'absolute', top: -6, right: 14,
                width: 10, height: 10,
                background: 'rgba(10,5,30,0.97)',
                border: '1px solid rgba(255,200,50,0.3)',
                borderBottom: 'none', borderRight: 'none',
                transform: 'rotate(45deg)',
              }} />
              <p style={{ fontWeight: 700, color: '#FFD580', marginBottom: 8, fontSize: 13 }}>
                ⚠️ Usá una wallet de Solana
              </p>
              <p style={{ marginBottom: 8 }}>
                Se recomienda <strong style={{ color: '#FFD580' }}>Solflare</strong> — la billetera oficial de Solana. Evitá wallets conectadas a Ethereum (como MetaMask), ya que los pagos enviados a la red incorrecta <strong style={{ color: '#FF6B6B' }}>no tienen devolución</strong>.
              </p>
              <p style={{ color: 'rgba(255,100,100,0.8)', fontSize: 11 }}>
                ⛔ Sin excepciones. No realizamos devoluciones bajo ninguna circunstancia.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
