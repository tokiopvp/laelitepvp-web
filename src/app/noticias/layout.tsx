import type { Metadata } from 'next'

/**
 * Metadatos de /noticias.
 *
 * POR QUE ESTAN EN UN LAYOUT Y NO EN LA PAGINA
 * -------------------------------------------
 * La pagina es `'use client'` (usa estado y efectos), y un componente de
 * cliente no puede exportar `metadata`. Sin este layout, las once paginas del
 * sitio heredaban el titulo del layout raiz: Google veia once paginas
 * ILUSTRADAS COMO LA MISMA, y ninguna podia posicionar por lo suyo.
 *
 * El layout si es de servidor, asi que aqui los metadatos si valen, y la
 * pagina sigue siendo interactiva.
 */
export const metadata: Metadata = {
  title: 'Noticias y filtraciones de Free Fire · La Elite PvP',
  description: 'Lo que se viene en Free Fire: filtraciones, novedades y anuncios, reunidos de las fuentes que siguen el juego.',
  alternates: { canonical: '/noticias' },
  openGraph: {
    title: 'Noticias y filtraciones de Free Fire · La Elite PvP',
    description: 'Lo que se viene en Free Fire: filtraciones, novedades y anuncios, reunidos de las fuentes que siguen el juego.',
    url: '/noticias',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
