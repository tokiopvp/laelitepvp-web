import type { Metadata, Viewport } from 'next'
import { Barlow, Oswald, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import AnimatedBackground from '@/components/layout/AnimatedBackground'
import WhatsAppSupport from '@/components/layout/WhatsAppSupport'

// Cuerpo: Barlow. Buena legibilidad en pantallas chicas y de gama baja, con
// mas caracter que las sans neutras de siempre.
const body = Barlow({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

// Titulos y marcadores: Oswald. Condensada con peso real, el registro de los
// tableros de estadio y los overlays de transmision.
const display = Oswald({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

// Cifras que se alinean en columna: K/D, precios, tops.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://laelitepvp.com'),
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
  themeColor: '#08080a',
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
    <html lang="es" className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen flex flex-col">
        <AnimatedBackground />
        <AuthProvider>
          <SiteNav />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <WhatsAppSupport />
        </AuthProvider>
      </body>
    </html>
  )
}