import type { Metadata } from 'next'

/**
 * Metadatos de /miembros.
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
  title: 'Miembros del clan · La Elite PvP',
  description: 'El squad oficial de La Elite PvP: K/D, headshots, Booyahs y estadisticas reales de cada jugador, sincronizadas desde Free Fire.',
  alternates: { canonical: '/miembros' },
  openGraph: {
    title: 'Miembros del clan · La Elite PvP',
    description: 'El squad oficial de La Elite PvP: K/D, headshots, Booyahs y estadisticas reales de cada jugador, sincronizadas desde Free Fire.',
    url: '/miembros',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
