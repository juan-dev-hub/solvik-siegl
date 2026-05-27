'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Library, Download, ExternalLink } from 'lucide-react'

type License = {
  id: string
  purchased_at: string
  solana_tx_hash: string
  cnft_address: string | null
  digital_products: {
    id: string
    title: string
    cover_arweave_id: string | null
    issuers: { institution_name: string; slug: string } | null
  } | null
}

export default function LibraryPage() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => {
        setWallet(d.issuer?.wallet_address ?? null)
        return fetch('/api/library/my-licenses')
      })
      .then(r => r.json())
      .then(d => setLicenses(d.licenses ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 4 }}>
          Mis compras
        </h1>
        <p style={{ color: 'rgba(180,210,255,0.4)', fontSize: 13, fontFamily: 'Luna, sans-serif' }}>
          Todos los libros que has adquirido.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card" style={{ height: 280, opacity: 0.4 }} />
          ))}
        </div>
      ) : licenses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="glass-card"
          style={{ textAlign: 'center', padding: '60px 40px' }}
        >
          <Library size={40} color="rgba(180,210,255,0.2)" style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 18, color: '#F0F8FF', marginBottom: 8 }}>
            Sin compras aún
          </p>
          <p style={{ color: 'rgba(180,210,255,0.45)', fontFamily: 'Luna, sans-serif', fontSize: 14, marginBottom: 24 }}>
            Explora la tienda y adquiere tu primer libro digital.
          </p>
          <motion.a
            href="/store"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Library size={16} /> Ir a la tienda
          </motion.a>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
          <AnimatePresence>
            {licenses.map((lic, i) => {
              const product = lic.digital_products
              return (
                <motion.div
                  key={lic.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.07 }}
                  className="glass-card"
                  style={{ padding: 0, overflow: 'hidden' }}
                >
                  {product?.cover_arweave_id ? (
                    <img
                      src={`https://arweave.net/${product.cover_arweave_id}`}
                      alt={product?.title ?? ''}
                      style={{ width: '100%', height: 140, objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: 140, background: 'linear-gradient(135deg, rgba(0,50,130,0.4), rgba(0,180,140,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Library size={32} color="rgba(74,186,255,0.3)" />
                    </div>
                  )}
                  <div style={{ padding: 18 }}>
                    <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 14, color: '#F0F8FF', marginBottom: 4 }}>
                      {product?.title ?? 'Producto'}
                    </p>
                    {product?.issuers && (
                      <p style={{ fontSize: 11, color: 'rgba(180,210,255,0.4)', fontFamily: 'Luna, sans-serif', marginBottom: 12 }}>
                        {product.issuers.institution_name}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: 'rgba(180,210,255,0.3)', fontFamily: 'Luna, sans-serif', marginBottom: 14 }}>
                      {new Date(lic.purchased_at).toLocaleDateString('es-ES')}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <motion.a
                        href={product?.id ? `/api/products/${product.id}/download?license=${lic.id}&wallet=${wallet ?? ''}` : '#'}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#4ABAFF', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'Luna, sans-serif' }}
                      >
                        <Download size={13} /> Descargar
                      </motion.a>
                      <a
                        href={`/license/${lic.id}`}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 10px', background: 'rgba(74,186,255,0.08)', border: '1px solid rgba(74,186,255,0.15)', borderRadius: 8, color: '#4ABAFF' }}
                        title="Ver licencia"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
