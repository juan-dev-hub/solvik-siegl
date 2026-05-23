'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ShoppingBag, Search } from 'lucide-react'
import gsap from 'gsap'

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

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/store/products')
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const el = gridRef.current
    if (!el || loading) return
    const cards = el.querySelectorAll('.store-card')
    if (!cards.length) return
    gsap.from(cards, {
      opacity: 0,
      y: 32,
      duration: 0.45,
      ease: 'power2.out',
      stagger: { amount: 0.6, from: 'start', grid: 'auto' },
    })
  }, [loading, search])

  const filtered = products.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.issuers?.institution_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid rgba(100,200,255,0.08)', backdropFilter: 'blur(12px)', background: 'rgba(8,14,28,0.7)', position: 'sticky', top: 0, zIndex: 50 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 28, borderRadius: 4 }} />
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16, color: '#F0F8FF' }}>Solvik Studio</span>
        </a>
        <LanguageSwitcher />
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ marginBottom: 40 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <ShoppingBag size={32} color="#4ABAFF" />
            <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 36, color: '#F0F8FF' }}>
              Tienda
            </h1>
          </div>
          <p style={{ fontSize: 15, color: 'rgba(180,210,255,0.55)', fontFamily: 'Inter, sans-serif' }}>
            Libros digitales y recursos verificados en blockchain.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
          style={{ position: 'relative', maxWidth: 400, marginBottom: 36 }}
        >
          <Search size={16} color="rgba(180,210,255,0.4)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            style={{ width: '100%', padding: '10px 14px 10px 40px', background: 'rgba(0,30,80,0.4)', border: '1px solid rgba(74,186,255,0.15)', borderRadius: 10, color: '#F0F8FF', fontFamily: 'Inter, sans-serif', fontSize: 14 }}
          />
        </motion.div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card" style={{ height: 320, opacity: 0.4, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <ShoppingBag size={48} color="rgba(180,210,255,0.15)" style={{ margin: '0 auto 20px', display: 'block' }} />
            <p style={{ color: 'rgba(180,210,255,0.4)', fontFamily: 'Nunito, sans-serif', fontSize: 18 }}>
              {search ? 'Sin resultados' : 'La tienda está vacía por ahora.'}
            </p>
          </div>
        ) : (
          <div ref={gridRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
            <AnimatePresence>
              {filtered.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

function ProductCard({ product: p }: { product: Product }) {
  const glowRef = useRef<HTMLDivElement>(null)
  const tween = useRef<gsap.core.Tween | null>(null)
  const available = p.total_copies - p.sold_copies

  const handleEnter = () => {
    if (!glowRef.current) return
    tween.current?.kill()
    tween.current = gsap.to(glowRef.current, { opacity: 0.6, scale: 1.05, duration: 0.8, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  }
  const handleLeave = () => {
    tween.current?.kill()
    if (glowRef.current) gsap.to(glowRef.current, { opacity: 0, scale: 1, duration: 0.3 })
  }

  return (
    <div
      className="glass-card store-card"
      style={{ padding: 0, overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <div ref={glowRef} style={{ position: 'absolute', inset: -6, borderRadius: 20, background: 'radial-gradient(circle, rgba(74,186,255,0.12) 0%, transparent 70%)', opacity: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {p.cover_arweave_id ? (
          <img
            src={`https://arweave.net/${p.cover_arweave_id}`}
            alt={p.title}
            style={{ width: '100%', height: 180, objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: 180, background: 'linear-gradient(135deg, rgba(0,50,130,0.4) 0%, rgba(0,180,140,0.2) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={40} color="rgba(74,186,255,0.3)" />
          </div>
        )}
        <div style={{ padding: 20 }}>
          <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 16, color: '#F0F8FF', marginBottom: 6 }}>{p.title}</p>
          {p.issuers && (
            <p style={{ fontSize: 11, color: 'rgba(180,210,255,0.4)', fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>
              por {p.issuers.institution_name}
            </p>
          )}
          {p.description && (
            <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.5)', fontFamily: 'Inter, sans-serif', marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
              {p.description}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#4ABAFF', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 18 }}>
                ${(p.price_usdc / 1_000_000).toFixed(2)}
              </p>
              <p style={{ fontSize: 10, color: 'rgba(180,210,255,0.3)', fontFamily: 'Inter, sans-serif' }}>
                {available} disponibles
              </p>
            </div>
            <motion.a
              href={`/store/${p.id}`}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{ background: '#4ABAFF', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, textDecoration: 'none', fontFamily: 'Nunito, sans-serif' }}
            >
              Ver
            </motion.a>
          </div>
        </div>
      </div>
    </div>
  )
}
