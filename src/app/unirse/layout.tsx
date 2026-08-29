import type { Metadata } from 'next'

/**
 * Metadatos de /unirse.
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
  title: 'Unete al clan · La Elite PvP',
  description: 'Postula para entrar a La Elite PvP, clan competitivo de Free Fire. Torneos, comunidad activa y premios para los miembros.',
  alternates: { canonical: '/unirse' },
  openGraph: {
    title: 'Unete al clan · La Elite PvP',
    description: 'Postula para entrar a La Elite PvP, clan competitivo de Free Fire. Torneos, comunidad activa y premios para los miembros.',
    url: '/unirse',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
