'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Plus, Edit3, ToggleLeft, ToggleRight } from 'lucide-react'

type Product = {
  id: string
  title: string
  price_usdc: number
  total_copies: number
  sold_copies: number
  is_active: boolean
  created_at: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProducts = () => {
    fetch('/api/products/mine')
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchProducts() }, [])

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/products/${id}/toggle`, { method: 'POST' })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 4 }}>
            Mis productos
          </h1>
          <p style={{ color: 'rgba(180,210,255,0.4)', fontSize: 13, fontFamily: 'Luna, sans-serif' }}>
            Gestiona tus libros digitales y recursos.
          </p>
        </div>
        <motion.a
          href="/dashboard/products/new"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', fontSize: 14 }}
        >
          <Plus size={16} /> Nuevo producto
        </motion.a>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card" style={{ height: 72, opacity: 0.4 }} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="glass-card"
          style={{ textAlign: 'center', padding: '60px 40px' }}
        >
          <ShoppingBag size={40} color="rgba(180,210,255,0.2)" style={{ margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 18, color: '#F0F8FF', marginBottom: 8 }}>
            Sin productos aún
          </p>
          <p style={{ color: 'rgba(180,210,255,0.45)', fontFamily: 'Luna, sans-serif', fontSize: 14, marginBottom: 24 }}>
            Crea tu primer libro digital y empieza a vender.
          </p>
          <motion.a
            href="/dashboard/products/new"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
          >
            <Plus size={16} /> Crear producto
          </motion.a>
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <AnimatePresence>
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.07 }}
                className="glass-card"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 15, color: '#F0F8FF', marginBottom: 4 }}>
                    {p.title}
                  </p>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(180,210,255,0.45)', fontFamily: 'Luna, sans-serif' }}>
                    <span>${(p.price_usdc / 1_000_000).toFixed(2)} USDC</span>
                    <span>{p.sold_copies}/{p.total_copies} vendidos</span>
                    <span>{new Date(p.created_at).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 11, color: p.is_active ? '#52C878' : 'rgba(180,210,255,0.3)', fontFamily: 'Luna, sans-serif', background: p.is_active ? 'rgba(82,200,120,0.1)' : 'rgba(180,210,255,0.05)', borderRadius: 20, padding: '3px 10px', border: `1px solid ${p.is_active ? 'rgba(82,200,120,0.3)' : 'rgba(180,210,255,0.1)'}` }}>
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    onClick={() => toggleActive(p.id, p.is_active)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: p.is_active ? '#4ABAFF' : 'rgba(180,210,255,0.3)', padding: 4 }}
                    title="Activar/desactivar"
                  >
                    {p.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  </button>
                  <a
                    href={`/store/${p.id}`}
                    style={{ color: 'rgba(180,210,255,0.4)', padding: 4, display: 'flex' }}
                    title="Ver en tienda"
                  >
                    <Edit3 size={16} />
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
