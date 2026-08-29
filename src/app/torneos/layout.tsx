import type { Metadata } from 'next'

/**
 * Metadatos de /torneos.
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
  title: 'Torneos ganados · La Elite PvP',
  description: 'Historial de torneos y campeonatos de Free Fire que ha ganado el clan La Elite PvP, con modo de juego y posicion.',
  alternates: { canonical: '/torneos' },
  openGraph: {
    title: 'Torneos ganados · La Elite PvP',
    description: 'Historial de torneos y campeonatos de Free Fire que ha ganado el clan La Elite PvP, con modo de juego y posicion.',
    url: '/torneos',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
