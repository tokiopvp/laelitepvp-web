import type { Metadata, Viewport } from 'next'
import { Inter, Sora, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ADSENSE_PUBLISHER } from '@/lib/adsense'
import { AuthProvider } from '@/components/auth/AuthProvider'
import SiteNav from '@/components/layout/SiteNav'
import SiteFooter from '@/components/layout/SiteFooter'
import AnimatedBackground from '@/components/layout/AnimatedBackground'
import AjusteRendimiento from '@/components/layout/AjusteRendimiento'

// Cuerpo: Inter. Es la sans de las interfaces que se ven caras (Linear,
// Vercel, Stripe) por un motivo concreto: se disenio para leerse en pantalla a
// tamano pequeno, no para imprimirse. Sustituye a Barlow, que tenia mas
// caracter del que un cuerpo de texto necesita y competia con los titulares.
const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

// Titulos: Sora. Geometrica y con contraste bajo; a peso alto llena sin
// gritar.
//
// Antes era Oswald, una condensada de marcador de estadio. Estaba elegida
// para "gritar deporte", y ese es justo el registro que hacia ver barato el
// sitio: condensada + neon + mayusculas es la formula del cartel de gimnasio.
const display = Sora({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '600', '700', '800'],
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
        {/* La primera consulta a la base sale nada mas hidratar. Adelantando
            aqui el DNS y el saludo TLS, ese viaje empieza ya resuelto: en un
            movil con datos son varias decimas de segundo antes de ver nada. */}
        <link rel="preconnect" href="https://thlbxskhcrxyejpvhpyn.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://thlbxskhcrxyejpvhpyn.supabase.co" />
        {/* El ?v= es lo UNICO que hace que un navegador vuelva a pedir el
            icono. Un favicon se cachea con una agresividad que no tiene
            ningun otro recurso -meses, y sobrevive a recargas forzadas-, asi
            que cambiar el fichero sin cambiar la URL no sirve de nada: el
            aguila ya estaba subida y las pestanas seguian con la estrella
            roja porque /favicon.ico?v=2 era byte a byte la misma direccion.

            SI SE CAMBIA EL ICONO, HAY QUE SUBIR ESTE NUMERO. Aqui y en
            manifest.json. */}
        <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
        {/* Los PNG antes que el .ico: casi todos los navegadores modernos
            prefieren el PNG si se les ofrece, y se ve mas limpio que el
            reescalado del .ico. */}
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon.png?v=3" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=3" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=3" />
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
        {/* UN SOLO DOMINIO: laelitepvp.com -> www.laelitepvp.com

            El sitio responde en los DOS, y para el navegador son origenes
            DISTINTOS: `localStorage` no se comparte entre ellos. Consecuencias
            reales que se vieron en produccion:

              · Quien entraba en www y luego abria el dominio sin www no tenia
                sesion, y creia que la web le habia cerrado la cuenta.
              · Si el login empezaba en un origen y volvia al otro, el
                verificador PKCE quedaba en el origen equivocado, el canje
                fallaba y la pantalla se quedaba en "Autenticando con Discord".

            Va como guion en el <head>, ANTES de que React arranque y antes de
            que se cree el cliente de Supabase: si esperase a la hidratacion, ya
            se habria leido la sesion del origen equivocado. Se conservan ruta,
            parametros y ancla para no romper el propio callback de Discord. */}
        <script dangerouslySetInnerHTML={{ __html: `!function(){try{if(location.hostname==='laelitepvp.com'){location.replace('https://www.laelitepvp.com'+location.pathname+location.search+location.hash)}}catch(e){}}();` }} />

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