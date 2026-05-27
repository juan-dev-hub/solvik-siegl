import type { Metadata, Viewport } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { SeasonalBackground } from '@/components/SeasonalBackground'
import { LanguageProvider } from '@/components/LanguageProvider'
import { ToastProvider } from '@/components/ToastProvider'
import { InactivityTimer } from '@/components/InactivityTimer'
import { PwaInit } from '@/components/PwaInit'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#7B2FFF',
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Solvik Studio — Certificación inmutable en Arweave',
  description: 'Emite certificados digitales permanentes en Arweave, verificables con QR, firmados con tu wallet de Solana.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Solvik Studio',
  },
  openGraph: {
    title: 'Solvik Studio',
    description: 'Certificación inmutable en Arweave',
    type: 'website',
    images: [{ url: '/logo.jpg', width: 512, height: 512 }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={outfit.variable}>
      <body>
        <PwaInit />
        <SeasonalBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <LanguageProvider>
            <ToastProvider>
              <InactivityTimer />
              {children}
            </ToastProvider>
          </LanguageProvider>
        </div>
      </body>
    </html>
  )
}
