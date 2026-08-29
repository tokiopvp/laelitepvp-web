import type { Metadata } from 'next'

/**
 * Metadatos de /comunidad.
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
  title: 'Elite Coin: gana premios jugando · La Elite PvP',
  description: 'Gana Elite Coin jugando PvP y en el Discord del clan, y cambialas por diamantes de Free Fire. Ranking, tareas y premios reales.',
  alternates: { canonical: '/comunidad' },
  openGraph: {
    title: 'Elite Coin: gana premios jugando · La Elite PvP',
    description: 'Gana Elite Coin jugando PvP y en el Discord del clan, y cambialas por diamantes de Free Fire. Ranking, tareas y premios reales.',
    url: '/comunidad',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
