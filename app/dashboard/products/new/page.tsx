'use client'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, BookOpen, AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Step = 'form' | 'uploading' | 'done'

export default function NewProductPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [totalCopies, setTotalCopies] = useState('9999')
  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setError('Selecciona un archivo PDF.'); return }
    if (!title.trim()) { setError('El título es obligatorio.'); return }
    if (!price || parseFloat(price) <= 0) { setError('El precio debe ser mayor a 0.'); return }

    setError(null)
    setStep('uploading')

    try {
      const form = new FormData()
      form.append('file', file)
      if (cover) form.append('cover', cover)
      form.append('title', title)
      form.append('description', description)
      form.append('price_usdc', price)
      form.append('total_copies', totalCopies)

      const res = await fetch('/api/products/create', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Error al crear el producto')

      setProductId(data.product?.id ?? null)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStep('form')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 28, color: '#F0F8FF', marginBottom: 4 }}>
          Nuevo producto
        </h1>
        <p style={{ color: 'rgba(180,210,255,0.4)', fontSize: 13, fontFamily: 'Luna, sans-serif' }}>
          Sube un PDF y empieza a vender con licencias verificadas en blockchain.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === 'done' ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="glass-card"
            style={{ textAlign: 'center', padding: '60px 40px' }}
          >
            <CheckCircle size={48} color="#52C878" style={{ margin: '0 auto 20px', display: 'block' }} />
            <h2 style={{ fontFamily: 'Luna, sans-serif', fontWeight: 800, fontSize: 24, color: '#F0F8FF', marginBottom: 8 }}>
              ¡Producto publicado!
            </h2>
            <p style={{ color: 'rgba(180,210,255,0.5)', fontFamily: 'Luna, sans-serif', marginBottom: 28 }}>
              Tu libro ya está disponible en la tienda.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              {productId && (
                <motion.a
                  href={`/store/${productId}`}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  Ver en tienda
                </motion.a>
              )}
              <motion.button
                onClick={() => router.push('/dashboard/products')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn-secondary"
              >
                Mis productos
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onSubmit={handleSubmit}
            style={{ maxWidth: 640 }}
          >
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 24 }}>
                <AlertCircle size={16} color="#ff6b6b" />
                <p style={{ fontSize: 13, color: '#ff6b6b', fontFamily: 'Luna, sans-serif' }}>{error}</p>
              </div>
            )}

            {/* PDF upload */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(180,210,255,0.6)', fontFamily: 'Luna, sans-serif', marginBottom: 8 }}>
                Archivo PDF *
              </label>
              <input type="file" ref={fileRef} accept=".pdf" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <motion.button
                type="button"
                onClick={() => fileRef.current?.click()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{ width: '100%', padding: '28px 20px', background: 'rgba(0,30,80,0.3)', border: `1px dashed ${file ? '#52C878' : 'rgba(74,186,255,0.2)'}`, borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
              >
                {file ? (
                  <>
                    <BookOpen size={28} color="#52C878" />
                    <p style={{ color: '#52C878', fontFamily: 'Luna, sans-serif', fontWeight: 700, fontSize: 14 }}>{file.name}</p>
                    <p style={{ color: 'rgba(82,200,120,0.6)', fontSize: 12, fontFamily: 'Luna, sans-serif' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Upload size={28} color="rgba(74,186,255,0.4)" />
                    <p style={{ color: 'rgba(180,210,255,0.5)', fontFamily: 'Luna, sans-serif', fontWeight: 600, fontSize: 14 }}>Click para seleccionar PDF</p>
                  </>
                )}
              </motion.button>
            </div>

            {/* Cover image */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(180,210,255,0.6)', fontFamily: 'Luna, sans-serif', marginBottom: 8 }}>
                Imagen de portada (opcional)
              </label>
              <input type="file" ref={coverRef} accept="image/*" style={{ display: 'none' }} onChange={e => setCover(e.target.files?.[0] ?? null)} />
              <button
                type="button"
                onClick={() => coverRef.current?.click()}
                style={{ padding: '10px 18px', background: 'rgba(0,30,80,0.3)', border: `1px solid ${cover ? 'rgba(74,186,255,0.4)' : 'rgba(74,186,255,0.12)'}`, borderRadius: 10, cursor: 'pointer', color: cover ? '#4ABAFF' : 'rgba(180,210,255,0.4)', fontSize: 13, fontFamily: 'Luna, sans-serif' }}
              >
                {cover ? `✓ ${cover.name}` : 'Subir portada'}
              </button>
            </div>

            {/* Title */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(180,210,255,0.6)', fontFamily: 'Luna, sans-serif', marginBottom: 8 }}>
                Título *
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Nombre del libro"
                required
                style={{ width: '100%' }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'rgba(180,210,255,0.6)', fontFamily: 'Luna, sans-serif', marginBottom: 8 }}>
                Descripción
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe tu libro..."
                rows={4}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* Price + copies */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'rgba(180,210,255,0.6)', fontFamily: 'Luna, sans-serif', marginBottom: 8 }}>
                  Precio (USDC) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="9.99"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'rgba(180,210,255,0.6)', fontFamily: 'Luna, sans-serif', marginBottom: 8 }}>
                  Copias disponibles
                </label>
                <input
                  type="number"
                  value={totalCopies}
                  onChange={e => setTotalCopies(e.target.value)}
                  placeholder="9999"
                  min="1"
                />
              </div>
            </div>

            <p style={{ fontSize: 11, color: 'rgba(180,210,255,0.3)', fontFamily: 'Luna, sans-serif', marginBottom: 20 }}>
              5% de cada venta se destina a Solvik Studio como comisión de plataforma.
            </p>

            <motion.button
              type="submit"
              disabled={step === 'uploading'}
              whileHover={step !== 'uploading' ? { scale: 1.03 } : {}}
              whileTap={step !== 'uploading' ? { scale: 0.97 } : {}}
              className="btn-primary"
              style={{ fontSize: 15, opacity: step === 'uploading' ? 0.7 : 1 }}
            >
              {step === 'uploading' ? 'Subiendo a Arweave...' : 'Publicar producto'}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
