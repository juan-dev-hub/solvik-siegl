'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

type License = {
  id: string
  buyer_wallet: string
  cnft_address: string | null
  purchased_at: string
  solana_tx_hash: string
  digital_products: {
    title: string
    description: string | null
    issuer_wallet: string
    issuers: { institution_name: string } | null
  } | null
}

function truncate(s: string) { return `${s.slice(0, 6)}...${s.slice(-6)}` }

export default function LicensePage() {
  const params = useParams<{ id: string }>()
  const [license, setLicense] = useState<License | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/license/${params.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(true); return }
        setLicense(d.license)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(180,210,255,0.5)' }}>
      ...
    </div>
  )

  if (error || !license) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40 }}>
      <AlertCircle size={48} color="#ff6b6b" />
      <h2 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 24, color: '#ff6b6b' }}>
        Licencia no encontrada
      </h2>
      <p style={{ color: 'rgba(180,210,255,0.5)', fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
        Este QR no corresponde a una licencia válida en Solvik Studio.
      </p>
    </div>
  )

  const product = license.digital_products

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="glass-card"
        style={{ maxWidth: 520, width: '100%', padding: 40 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 32, borderRadius: 6 }} />
          </a>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(180,210,255,0.4)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Solvik Studio</p>
            <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, color: '#F0F8FF' }}>Verificación de licencia</p>
          </div>
        </div>

        {/* Valid badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(82,200,120,0.1)', border: '1px solid rgba(82,200,120,0.3)', borderRadius: 12, padding: '14px 20px', marginBottom: 28 }}>
          <CheckCircle size={24} color="#52C878" />
          <div>
            <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 16, color: '#52C878' }}>Licencia válida</p>
            <p style={{ fontSize: 12, color: 'rgba(82,200,120,0.7)', fontFamily: 'Inter, sans-serif' }}>Compra verificada en Solana blockchain</p>
          </div>
        </div>

        {/* Product info */}
        {product && (
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.4)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Producto</p>
            <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 22, color: '#F0F8FF', marginBottom: 4 }}>
              {product.title}
            </p>
            {product.issuers && (
              <p style={{ fontSize: 13, color: '#4ABAFF', fontFamily: 'Inter, sans-serif' }}>
                por {product.issuers.institution_name}
              </p>
            )}
          </div>
        )}

        {/* License details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Propietario', value: truncate(license.buyer_wallet) },
            { label: 'Fecha de compra', value: new Date(license.purchased_at).toLocaleDateString('es-ES') },
            { label: 'ID de licencia', value: license.id.slice(0, 12) + '…' },
            { label: 'TX Solana', value: truncate(license.solana_tx_hash) },
          ].map(row => (
            <div key={row.label} style={{ background: 'rgba(0,30,80,0.3)', borderRadius: 10, padding: '12px 16px' }}>
              <p style={{ fontSize: 10, color: 'rgba(180,210,255,0.4)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{row.label}</p>
              <p style={{ fontSize: 13, color: '#F0F8FF', fontFamily: 'SF Mono, Fira Code, monospace' }}>{row.value}</p>
            </div>
          ))}
        </div>

        {license.cnft_address && (
          <a
            href={`https://solscan.io/token/${license.cnft_address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4ABAFF', textDecoration: 'none', fontFamily: 'Inter, sans-serif' }}
          >
            <ExternalLink size={12} />
            Ver NFT de licencia en Solscan
          </a>
        )}

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: 'rgba(180,210,255,0.2)', fontFamily: 'Inter, sans-serif' }}>
          powered by Solvik Studio
        </p>
      </motion.div>
    </div>
  )
}
