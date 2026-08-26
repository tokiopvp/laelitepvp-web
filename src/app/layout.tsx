import type { Metadata, Viewport } from 'next'
import { Inter, Rajdhani } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const rajdhani = Rajdhani({
  subsets: ['latin'],
  variable: '--font-rajdhani',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'La Elite PvP | Clan Competitivo Free Fire',
  description: 'Clan competitivo de Free Fire. Tops, rankings, miembros oficiales, torneos ganados y PagoStore Premium para diamantes.',
  keywords: ['Free Fire', 'Clan', 'La Elite PvP', 'Competitivo', 'Torneos', 'Diamantes', 'PagoStore'],
  authors: [{ name: 'La Elite PvP' }],
  creator: 'La Elite PvP',
  publisher: 'La Elite PvP',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://laelitepvp.com',
    title: 'La Elite PvP | Clan Competitivo Free Fire',
    description: 'Clan competitivo de Free Fire. Tops, rankings, miembros oficiales, torneos ganados y PagoStore Premium.',
    siteName: 'La Elite PvP',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'La Elite PvP - Clan Competitivo Free Fire',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'La Elite PvP | Clan Competitivo Free Fire',
    description: 'Clan competitivo de Free Fire. Tops, rankings, miembros oficiales, torneos ganados.',
    images: ['/og-image.jpg'],
  },
  verification: {
    google: 'google-site-verification-code',
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${rajdhani.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}