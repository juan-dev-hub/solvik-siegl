'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/components/LanguageProvider'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { usePathname, useRouter } from 'next/navigation'
import {
  Award, FolderOpen, List, CreditCard, Globe, LayoutDashboard,
  Image, LogOut, ExternalLink, Code2, ShoppingBag, Library,
  Home, Store, ChevronRight, Settings, Menu, X, Monitor,
} from 'lucide-react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.solvikstudio.com'

function Accordion({
  label, icon, children, defaultOpen = false,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '9px 12px', borderRadius: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(180,210,255,0.5)', fontSize: 13,
          transition: 'color 0.15s',
        }}
      >
        {icon}
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        <ChevronRight
          size={12}
          style={{
            opacity: 0.4,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden', paddingLeft: 8 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const router = useRouter()
  const [slug, setSlug] = useState<string | null>(null)
  const [showWidgetModal, setShowWidgetModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => setSlug(d.issuer?.slug ?? null))
      .catch(() => {})
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const handleCopy = () => {
    const code = `<a href="${APP_URL}/i/${slug}" target="_blank">\n  <img src="${APP_URL}/api/widget/${slug}" alt="Verificado con Solvik Studio" />\n</a>`
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const nav = [
    { label: t.dashboard.overview,   href: '/dashboard',               icon: <LayoutDashboard size={16} /> },
    { label: t.dashboard.new_cert,   href: '/dashboard/new',           icon: <Award size={16} /> },
    { label: t.dashboard.batch,      href: '/dashboard/batch',         icon: <FolderOpen size={16} /> },
    { label: t.dashboard.my_certs,   href: '/dashboard/certs',         icon: <List size={16} /> },
    { label: t.dashboard.gallery,    href: '/dashboard/gallery',       icon: <Image size={16} /> },
    { label: 'Mis productos',         href: '/dashboard/products',      icon: <ShoppingBag size={16} /> },
    { label: 'Mis compras',           href: '/dashboard/library',       icon: <Library size={16} /> },
    { label: 'Mi página',             href: '/dashboard/page-settings', icon: <Monitor size={16} /> },
  ]

  const embedCode = `<a href="${APP_URL}/i/${slug}" target="_blank">\n  <img src="${APP_URL}/api/widget/${slug}" alt="Verificado con Solvik Studio" />\n</a>`

  const linkStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', borderRadius: 10, marginBottom: 2,
    textDecoration: 'none', background: 'none', border: 'none',
    color: 'rgba(180,210,255,0.5)', fontSize: 13, cursor: 'pointer',
    width: '100%', textAlign: 'left' as const,
    transition: 'color 0.15s',
  }

  const sidebar = (
    <aside style={{
      width: 240, background: 'rgba(0,20,60,0.6)', backdropFilter: 'blur(24px)',
      borderRight: '1px solid rgba(100,200,255,0.1)',
      display: 'flex', flexDirection: 'column', padding: '24px 0',
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
      transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
      transition: 'transform 0.3s ease',
    }}>
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(100,200,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.jpg" alt="Solvik Studio" style={{ height: 28, objectFit: 'contain', borderRadius: 4 }} />
          <span style={{ fontWeight: 800, fontSize: 15, color: '#F0F8FF' }}>Solvik Studio</span>
        </a>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(180,210,255,0.5)', padding: 4 }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        {nav.map((item, i) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <motion.a
              key={item.href}
              href={item.href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.28, ease: 'easeOut' }}
              whileHover={{ x: 2 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10, marginBottom: 4,
                textDecoration: 'none',
                background: active ? 'rgba(74,186,255,0.12)' : 'transparent',
                color: active ? '#4ABAFF' : 'rgba(180,210,255,0.6)',
                fontSize: 14, transition: 'background 0.15s, color 0.15s',
              }}
            >
              {item.icon}
              {item.label}
            </motion.a>
          )
        })}

        <div style={{ borderTop: '1px solid rgba(100,200,255,0.08)', margin: '10px 0' }} />

        <Accordion label="Ver en público" icon={<ExternalLink size={15} />}>
          <a href="/store" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            <Store size={15} />
            Tienda pública
            <ExternalLink size={9} style={{ marginLeft: 'auto', opacity: 0.35 }} />
          </a>
          <a
            href={slug ? `/i/${slug}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...linkStyle, opacity: slug ? 1 : 0.38, pointerEvents: slug ? 'auto' : 'none' }}
          >
            <Home size={15} />
            Mi página pública
            <ExternalLink size={9} style={{ marginLeft: 'auto', opacity: 0.35 }} />
          </a>
          <button
            onClick={() => slug && setShowWidgetModal(true)}
            style={{ ...linkStyle, opacity: slug ? 1 : 0.38, cursor: slug ? 'pointer' : 'default' }}
          >
            <Code2 size={15} />
            Obtener widget
          </button>
        </Accordion>

        <Accordion label="Cuenta" icon={<Settings size={15} />}>
          <a href="/pricing" style={linkStyle}>
            <CreditCard size={15} />
            {t.dashboard.my_plan}
          </a>
          <a
            href="/dashboard/sns"
            style={{
              ...linkStyle,
              background: pathname === '/dashboard/sns' ? 'rgba(74,186,255,0.08)' : 'none',
              color: pathname === '/dashboard/sns' ? '#4ABAFF' : 'rgba(180,210,255,0.5)',
            }}
          >
            <Globe size={15} />
            {t.dashboard.verify_sns}
          </a>
        </Accordion>
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(100,200,255,0.08)' }}>
        <div style={{ marginBottom: 12 }}>
          <LanguageSwitcher />
        </div>
        <button
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', color: 'rgba(180,210,255,0.4)', cursor: 'pointer', fontSize: 13, padding: '8px 0' }}
        >
          <LogOut size={14} />
          {t.dashboard.disconnect_label}
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 39 }}
        />
      )}

      {sidebar}

      {/* Main content */}
      <main style={{
        marginLeft: isMobile ? 0 : 240,
        flex: 1,
        padding: isMobile ? '24px 16px' : '40px 48px',
        minWidth: 0,
      }}>
        {/* Mobile topbar */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'rgba(74,186,255,0.1)', border: '1px solid rgba(74,186,255,0.2)', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#4ABAFF', display: 'flex', alignItems: 'center' }}
            >
              <Menu size={18} />
            </button>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#F0F8FF' }}>Solvik Studio</span>
          </div>
        )}

        <div style={{ background: 'rgba(74,186,255,0.06)', border: '1px solid rgba(74,186,255,0.15)', borderRadius: 10, padding: '10px 18px', marginBottom: 32, fontSize: 12, color: 'rgba(180,210,255,0.5)' }}>
          ℹ️ {t.dashboard.disclaimer_banner}
        </div>
        {children}
      </main>

      {/* Widget modal */}
      <AnimatePresence>
        {showWidgetModal && slug && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setShowWidgetModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'rgba(5,20,60,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(74,186,255,0.2)', borderRadius: 16, padding: 32, maxWidth: 560, width: '100%' }}
            >
              <h3 style={{ fontWeight: 800, fontSize: 20, color: '#F0F8FF', marginBottom: 8 }}>
                Obtener widget
              </h3>
              <p style={{ fontSize: 13, color: 'rgba(180,210,255,0.5)', marginBottom: 20 }}>
                Pega este código en tu sitio web para mostrar tu badge verificado.
              </p>
              <code style={{ display: 'block', background: 'rgba(0,15,50,0.7)', border: '1px solid rgba(74,186,255,0.15)', borderRadius: 8, padding: '14px 16px', fontSize: 11, color: '#4ABAFF', fontFamily: 'SF Mono, Fira Code, monospace', wordBreak: 'break-all', marginBottom: 20, whiteSpace: 'pre' }}>
                {embedCode}
              </code>
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, color: 'rgba(180,210,255,0.4)', marginBottom: 8 }}>Vista previa:</p>
                <img
                  src={`${APP_URL}/api/widget/${slug}`}
                  alt="Widget preview"
                  style={{ borderRadius: 8, maxWidth: '100%' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
                <motion.button onClick={handleCopy} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn-primary" style={{ fontSize: 13 }}>
                  {copied ? '✓ Copiado' : 'Copiar código'}
                </motion.button>
                <motion.button onClick={() => setShowWidgetModal(false)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="btn-secondary" style={{ fontSize: 13 }}>
                  Cerrar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
