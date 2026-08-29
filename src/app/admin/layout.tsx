import type { Metadata } from 'next'

/**
 * El panel no se indexa.
 *
 * No es una medida de seguridad —eso lo hace `AdminGuard` con el rol del
 * usuario— sino de higiene: el panel no tiene nada que posicionar, y que
 * aparezca en Google solo invita a que gente ajena lo toquetee.
 */
export const metadata: Metadata = {
  title: 'Panel · La Elite PvP',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
