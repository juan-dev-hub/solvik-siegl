'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ShoppingBag, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import {
  getAssociatedTokenAddress,
  createTransferCheckedInstruction,
  getMint,
} from '@solana/spl-token'

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com'
const FEE_BPS = 500 // 5%

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

declare global {
  interface Window {
    solana?: { isPhantom?: boolean; publicKey?: PublicKey; signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }> }
    solflare?: { publicKey?: PublicKey; signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }> }
  }
}

export default function ProductPage() {
  const params = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [licenseId, setLicenseId] = useState<string | null>(null)

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/products/${params.id}`)
      .then(r => r.json())
      .then(d => setProduct(d.product ?? null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [params.id])

  const handleBuy = async () => {
    if (!product) return
    const provider = window.solflare ?? window.solana
    if (!provider?.publicKey) {
      setStatus({ type: 'error', message: 'Conecta tu wallet primero.' })
      return
    }

    setBuying(true)
    setStatus(null)
    try {
      const buyerPubkey = provider.publicKey
      const conn = new Connection(RPC, 'confirmed')
      const issuerPubkey = new PublicKey(product.issuer_wallet)

      const buyerAta = await getAssociatedTokenAddress(USDC_MINT, buyerPubkey)
      const issuerAta = await getAssociatedTokenAddress(USDC_MINT, issuerPubkey)

      const mintInfo = await getMint(conn, USDC_MINT)
      const decimals = mintInfo.decimals

      // 95% to issuer (buyer initiates; 5% fee tracked off-chain)
      const transferAmount = BigInt(Math.floor(product.price_usdc * (1 - FEE_BPS / 10000)))

      const { blockhash } = await conn.getLatestBlockhash()
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: buyerPubkey })
      tx.add(
        createTransferCheckedInstruction(
          buyerAta,
          USDC_MINT,
          issuerAta,
          buyerPubkey,
          transferAmount,
          decimals,
        )
      )

      const { signature } = await provider.signAndSendTransaction(tx)
      await conn.confirmTransaction(signature, 'confirmed')

      const res = await fetch(`/api/products/${product.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: signature, buyerWallet: buyerPubkey.toBase58() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al procesar la compra')

      setLicenseId(data.licenseId)
      setStatus({ type: 'success', message: '¡Compra exitosa! Ya puedes descargar tu libro.' })
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Error desconocido' })
    } finally {
      setBuying(false)
    }
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
  const soldOut = available <= 0

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(100,200,255,0.08)', backdropFilter: 'blur(12px)', background: 'rgba(8,14,28,0.7)', position: 'sticky', top: 0, zIndex: 50 }}>
        <a href="/store" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 28, borderRadius: 4 }} />
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16, color: '#F0F8FF' }}>Solvik Studio</span>
        </a>
        <LanguageSwitcher />
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 40px' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 40, alignItems: 'start' }}
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
            <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.4)', fontFamily: 'Inter, sans-serif', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Libro digital
            </p>
            <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 32, color: '#F0F8FF', lineHeight: 1.2, marginBottom: 12 }}>
              {product.title}
            </h1>
            {product.issuers && (
              <a href={`/i/${product.issuers.slug}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4ABAFF', textDecoration: 'none', marginBottom: 20 }}>
                <ExternalLink size={12} />
                {product.issuers.institution_name}
              </a>
            )}
            {product.description && (
              <p style={{ fontSize: 14, color: 'rgba(180,210,255,0.6)', fontFamily: 'Inter, sans-serif', lineHeight: 1.7, marginBottom: 28 }}>
                {product.description}
              </p>
            )}

            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 36, fontFamily: 'Nunito, sans-serif', fontWeight: 800, color: '#4ABAFF' }}>
                    ${(product.price_usdc / 1_000_000).toFixed(2)}
                    <span style={{ fontSize: 14, color: 'rgba(180,210,255,0.4)', marginLeft: 6 }}>USDC</span>
                  </p>
                  <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.35)', fontFamily: 'Inter, sans-serif' }}>
                    {soldOut ? '¡Agotado!' : `${available} de ${product.total_copies} disponibles`}
                  </p>
                </div>
              </div>

              {status && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
                    borderRadius: 10, marginBottom: 16,
                    background: status.type === 'success' ? 'rgba(82,200,120,0.1)' : 'rgba(255,80,80,0.1)',
                    border: `1px solid ${status.type === 'success' ? 'rgba(82,200,120,0.3)' : 'rgba(255,80,80,0.3)'}`,
                  }}
                >
                  {status.type === 'success'
                    ? <CheckCircle size={16} color="#52C878" style={{ flexShrink: 0, marginTop: 1 }} />
                    : <AlertCircle size={16} color="#ff6b6b" style={{ flexShrink: 0, marginTop: 1 }} />}
                  <p style={{ fontSize: 13, color: status.type === 'success' ? '#52C878' : '#ff6b6b', fontFamily: 'Inter, sans-serif' }}>
                    {status.message}
                  </p>
                </motion.div>
              )}

              {licenseId ? (
                <motion.a
                  href={`/api/products/${product.id}/download?license=${licenseId}&wallet=${typeof window !== 'undefined' ? (window.solflare?.publicKey?.toBase58() ?? window.solana?.publicKey?.toBase58() ?? '') : ''}`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', fontSize: 15, textDecoration: 'none' }}
                >
                  ↓ Descargar PDF
                </motion.a>
              ) : (
                <motion.button
                  onClick={handleBuy}
                  disabled={buying || soldOut}
                  whileHover={!buying && !soldOut ? { scale: 1.03 } : {}}
                  whileTap={!buying && !soldOut ? { scale: 0.97 } : {}}
                  className="btn-primary"
                  style={{ width: '100%', fontSize: 15, opacity: soldOut ? 0.5 : 1, cursor: soldOut ? 'not-allowed' : 'pointer' }}
                >
                  {buying ? 'Procesando...' : soldOut ? 'Agotado' : 'Comprar ahora'}
                </motion.button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                '✓ Licencia permanente',
                '✓ PDF con QR de verificación',
                '✓ Compra en blockchain',
              ].map(f => (
                <span key={f} style={{ fontSize: 11, color: 'rgba(180,210,255,0.4)', background: 'rgba(74,186,255,0.06)', border: '1px solid rgba(74,186,255,0.1)', borderRadius: 20, padding: '4px 12px', fontFamily: 'Inter, sans-serif' }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
