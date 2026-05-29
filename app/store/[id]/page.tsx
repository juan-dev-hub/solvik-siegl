'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ShoppingBag, ExternalLink, CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react'
import QRCode from 'qrcode'

type Product = {
  id: string
  title: string
  description: string | null
  cover_arweave_id: string | null
  price_usdc: number
  total_copies: number
  sold_copies: number
  issuer_wallet: string
  issuers: { institution_name: string; slug: string } | null
}

type ModalState = {
  qrDataUrl: string
  reference: string
}

export default function ProductPage() {
  const params = useParams<{ id: string }>()
  const [product, setProduct]       = useState<Product | null>(null)
  const [loading, setLoading]       = useState(true)
  const [buying, setBuying]         = useState(false)
  const [modal, setModal]           = useState<ModalState | null>(null)
  const [pollStatus, setPollStatus] = useState<'waiting' | 'success'>('waiting')
  const [licenseId, setLicenseId]   = useState<string | null>(null)
  const [errorMsg, setErrorMsg]     = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/products/${params.id}`)
      .then(r => r.json())
      .then(d => setProduct(d.product ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  useEffect(() => {
    if (!modal) {
      if (pollRef.current) clearInterval(pollRef.current)
      if (pollStatus !== 'success') setPollStatus('waiting')
    }
  }, [modal])

  const handleBuy = async () => {
    if (!product) return
    setBuying(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/pay/qr?product=${product.id}&amount=${product.price_usdc}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error generando QR')

      const qrDataUrl = await QRCode.toDataURL(data.url, {
        width: 280,
        margin: 2,
        color: { dark: '#0a1628', light: '#f0f8ff' },
      })

      setModal({ qrDataUrl, reference: data.reference })
      startPolling(data.reference, product.id)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error generando QR')
    } finally {
      setBuying(false)
    }
  }

  function startPolling(reference: string, productId: string) {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/pay/status?reference=${reference}`)
        const data = await res.json()
        if (!data.found) return

        clearInterval(pollRef.current!)

        const purchaseRes = await fetch(`/api/products/${productId}/purchase`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash: data.signature }),
        })
        const purchaseData = await purchaseRes.json()
        if (!purchaseRes.ok) throw new Error(purchaseData.error ?? 'Error procesando compra')

        setLicenseId(purchaseData.licenseId)
        setPollStatus('success')
      } catch {
        // keep polling
      }
    }, 2000)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(180,210,255,0.5)' }}>
      ...
    </div>
  )
  if (!product) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b' }}>
      Producto no encontrado
    </div>
  )

  const available = product.total_copies - product.sold_copies
  const soldOut   = available <= 0

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px clamp(16px,5vw,40px)', borderBottom: '1px solid rgba(100,200,255,0.08)', backdropFilter: 'blur(12px)', background: 'rgba(8,14,28,0.7)', position: 'sticky', top: 0, zIndex: 50 }}>
        <a href="/store" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 28, borderRadius: 4 }} />
          <span style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 16, color: '#F0F8FF' }}>Solvik Studio</span>
        </a>
        <LanguageSwitcher />
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(24px,6vw,48px) clamp(16px,5vw,40px)' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32, alignItems: 'start' }}
        >
          {/* Cover */}
          <div>
            {product.cover_arweave_id ? (
              <img
                src={`https://arweave.net/${product.cover_arweave_id}`}
                alt={product.title}
                style={{ width: '100%', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
              />
            ) : (
              <div style={{ width: '100%', aspectRatio: '3/4', background: 'linear-gradient(135deg, rgba(0,50,130,0.5), rgba(0,180,140,0.3))', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShoppingBag size={60} color="rgba(74,186,255,0.4)" />
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.4)', fontFamily: 'Luna, sans-serif', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Libro digital
            </p>
            <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 32, color: '#F0F8FF', lineHeight: 1.2, marginBottom: 12 }}>
              {product.title}
            </h1>
            {product.issuers && (
              <a href={`/i/${product.issuers.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4ABAFF', textDecoration: 'none', marginBottom: 20 }}>
                <ExternalLink size={12} />
                {product.issuers.institution_name}
              </a>
            )}
            {product.description && (
              <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.6)', fontFamily: 'Luna, sans-serif', lineHeight: 1.7, marginBottom: 28 }}>
                {product.description}
              </p>
            )}

            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 36, fontFamily: 'Luna, sans-serif', fontWeight: 800, color: '#4ABAFF' }}>
                  ${(product.price_usdc / 1_000_000).toFixed(2)}
                  <span style={{ fontSize: 14, color: 'rgba(180,210,255,0.4)', marginLeft: 6 }}>USDC</span>
                </p>
                <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.35)', fontFamily: 'Luna, sans-serif' }}>
                  {soldOut ? '¡Agotado!' : `${available} de ${product.total_copies} disponibles`}
                </p>
              </div>

              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', borderRadius: 10, marginBottom: 16, background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)' }}
                >
                  <AlertCircle size={16} color="#ff6b6b" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: '#ff6b6b', fontFamily: 'Luna, sans-serif' }}>{errorMsg}</p>
                </motion.div>
              )}

              {licenseId ? (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#52C878', fontFamily: 'Luna, sans-serif', fontSize: 14, marginBottom: 16 }}>
                    <CheckCircle size={18} />
                    ¡Compra exitosa!
                  </div>
                  <a
                    href={`/api/products/${product.id}/download?license=${licenseId}`}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', fontSize: 15, textDecoration: 'none' }}
                  >
                    ↓ Descargar PDF
                  </a>
                </motion.div>
              ) : (
                <motion.button
                  onClick={handleBuy}
                  disabled={buying || soldOut}
                  whileHover={!buying && !soldOut ? { scale: 1.03 } : {}}
                  whileTap={!buying && !soldOut ? { scale: 0.97 } : {}}
                  className="btn-primary"
                  style={{ width: '100%', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: soldOut ? 0.5 : 1, cursor: soldOut ? 'not-allowed' : 'pointer' }}
                >
                  {buying
                    ? <><Loader2 size={14} className="animate-spin" /> Generando QR...</>
                    : soldOut ? 'Agotado' : 'Comprar ahora'}
                </motion.button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['✓ Licencia permanente', '✓ PDF con QR de verificación', '✓ Compra en blockchain'].map(f => (
                <span key={f} style={{ fontSize: 11, color: 'rgba(180,210,255,0.4)', background: 'rgba(74,186,255,0.06)', border: '1px solid rgba(74,186,255,0.1)', borderRadius: 20, padding: '4px 12px', fontFamily: 'Luna, sans-serif' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modal QR */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              style={{ position: 'relative', background: 'rgba(5,18,55,0.98)', backdropFilter: 'blur(24px)', border: '1px solid rgba(74,186,255,0.2)', borderRadius: 20, padding: 36, textAlign: 'center', maxWidth: 380, width: '90%' }}
            >
              <button
                onClick={() => setModal(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'rgba(180,210,255,0.4)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>

              {pollStatus === 'success' ? (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                  <CheckCircle size={64} color="#52C878" style={{ margin: '0 auto 16px' }} />
                  <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 22, color: '#52C878', marginBottom: 8 }}>¡Pago confirmado!</p>
                  <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.5)', fontFamily: 'Luna, sans-serif', marginBottom: 20 }}>
                    Cierra este modal para descargar tu libro.
                  </p>
                  <button onClick={() => setModal(null)} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    Ver descarga
                  </button>
                </motion.div>
              ) : (
                <>
                  <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 20, color: '#F0F8FF', marginBottom: 6 }}>
                    {product.title}
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.5)', fontFamily: 'Luna, sans-serif', marginBottom: 24 }}>
                    ${(product.price_usdc / 1_000_000).toFixed(2)} USDC
                  </p>
                  <img
                    src={modal.qrDataUrl}
                    alt="QR de pago"
                    style={{ width: 240, height: 240, borderRadius: 12, margin: '0 auto 20px', display: 'block' }}
                  />

                  {/* Camera tip */}
                  <div style={{ background: 'rgba(74,186,255,0.07)', border: '1px solid rgba(74,186,255,0.18)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                    <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.75)', fontFamily: 'Luna, sans-serif', lineHeight: 1.6 }}>
                      Apunta la <strong style={{ color: '#4ABAFF' }}>cámara de tu teléfono</strong> al código QR — tu wallet se abrirá automáticamente para completar el pago de forma segura.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(180,210,255,0.35)', fontSize: 12, fontFamily: 'Luna, sans-serif' }}>
                    <Loader2 size={12} className="animate-spin" />
                    Esperando confirmación en blockchain...
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
