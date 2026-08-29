import type { Metadata, Viewport } from 'next'
import { Barlow, Oswald, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ADSENSE_PUBLISHER } from '@/lib/adsense'
import { AuthProvider } from '@/components/auth/AuthProvider'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import AnimatedBackground from '@/components/layout/AnimatedBackground'
import AjusteRendimiento from '@/components/layout/AjusteRendimiento'

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
  // El dominio sin www NO resuelve (no tiene registro A). Todo apunta a
  // www, que es lo unico que sirve, igual que el sitemap y el robots.
  metadataBase: new URL('https://www.laelitepvp.com'),
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
    url: 'https://www.laelitepvp.com',
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
        {/* AdSense. Solo se carga si hay editor configurado: sin IDs no se
            pide nada a Google, ni script ni cookies. Va con async para que
            nunca bloquee el pintado de la pagina. */}
        {ADSENSE_PUBLISHER ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER}`}
            crossOrigin="anonymous"
          />
        ) : null}
        {/* La gama se marca ANTES del primer pintado.
            Si esperamos a que React hidrate, el navegador ya ha pintado una vez
            con todos los efectos caros puestos: justo en los equipos lentos, que
            son los que mas tardan en hidratar, esa primera pintada con decenas
            de `backdrop-filter` es la que se nota. Este guion va en el <head>,
            corre antes de nada y no depende de que cargue el JavaScript.
            Despues `AjusteRendimiento` lo corrige si la medida de fotogramas
            dice otra cosa. */}
        <script dangerouslySetInnerHTML={{ __html: `!function(){try{var d=document.documentElement,n=navigator,g=sessionStorage.getItem('elite_gama_medida');if(g){g=JSON.parse(g).gama}else{if(matchMedia('(prefers-reduced-motion: reduce)').matches||(n.connection&&n.connection.saveData)){d.dataset.quieto='si';g='ahorro'}else{var c=n.hardwareConcurrency||4,m=n.deviceMemory||8,w=(screen&&screen.width)||1024,t=matchMedia('(pointer: coarse)').matches;g=(c<4||m<4)?'bajo':((c>=8&&!t&&w>=1280)?'alto':'medio')}}d.dataset.gama=g;if(g==='ahorro')d.dataset.quieto='si'}catch(e){}}();` }} />
      </head>
      <body className="min-h-screen flex flex-col">
        {/* Mide el equipo y marca la gama en el <html>: de ahi cuelgan
            las reglas que apagan lo caro en maquinas justas. */}
        <AjusteRendimiento />
        <AnimatedBackground />
        <AuthProvider>
          <SiteNav />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  )
}