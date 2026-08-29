import type { Metadata } from 'next'

/**
 * Metadatos de /tops.
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
  title: 'Tops y rankings · La Elite PvP',
  description: 'Los mejores del clan por K/D, headshots, victorias y Booyahs. Ranking actualizado con datos reales de partida.',
  alternates: { canonical: '/tops' },
  openGraph: {
    title: 'Tops y rankings · La Elite PvP',
    description: 'Los mejores del clan por K/D, headshots, victorias y Booyahs. Ranking actualizado con datos reales de partida.',
    url: '/tops',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
