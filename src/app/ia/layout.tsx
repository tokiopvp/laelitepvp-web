import type { Metadata } from 'next'

/**
 * Metadatos de /ia.
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
  title: 'TOKIO IA: sensibilidad para tu movil · La Elite PvP',
  description: 'Calcula la sensibilidad de Free Fire para tu telefono concreto. Ajustes de mira, DPI y control de retroceso, gratis.',
  alternates: { canonical: '/ia' },
  openGraph: {
    title: 'TOKIO IA: sensibilidad para tu movil · La Elite PvP',
    description: 'Calcula la sensibilidad de Free Fire para tu telefono concreto. Ajustes de mira, DPI y control de retroceso, gratis.',
    url: '/ia',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
