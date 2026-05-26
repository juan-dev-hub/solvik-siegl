import type { Metadata } from 'next'
import './globals.css'
import { SeasonalBackground } from '@/components/SeasonalBackground'
import { LanguageProvider } from '@/components/LanguageProvider'

export const metadata: Metadata = {
  title: 'Solvik Studio — Certificación inmutable en Arweave',
  description: 'Emite certificados digitales permanentes en Arweave, verificables con QR, firmados con tu wallet de Solana.',
  icons: { icon: '/logo.jpg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SeasonalBackground />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </div>
      </body>
    </html>
  )
}
