import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import { SeasonalBackground } from '@/components/SeasonalBackground'
import { LanguageProvider } from '@/components/LanguageProvider'
import { ToastProvider } from '@/components/ToastProvider'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Solvik Studio — Certificación inmutable en Arweave',
  description: 'Emite certificados digitales permanentes en Arweave, verificables con QR, firmados con tu wallet de Solana.',
  icons: { icon: '/logo.jpg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <SeasonalBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <LanguageProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </LanguageProvider>
        </div>
      </body>
    </html>
  )
}
