'use client'

import { useEffect, useRef } from 'react'
import { ADSENSE_PUBLISHER, ADSENSE_SLOT_FEED, adsenseActivo } from '@/lib/adsense'

/**
 * Anuncio in-feed, con la forma de las tarjetas de noticias.
 *
 * POR QUE VA ETIQUETADO
 * ---------------------
 * Las politicas de AdSense exigen que el anuncio se distinga del contenido, y
 * disfrazarlo del todo es de las causas mas comunes de cierre de cuenta. Lo
 * que SI permiten -y recomiendan- es que adopte la tipografia, los colores y
 * la forma del sitio: eso es lo que hace este componente. Encaja en la
 * cuadricula sin cantar, rinde mas que un banner suelto, y la etiqueta es
 * pequeña y discreta.
 *
 * Dicho de otro modo: se integra en el diseño, no se esconde. La primera cosa
 * paga; la segunda cuesta la cuenta.
 */
declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

export default function AnuncioFeed() {
  const montado = useRef(false)

  useEffect(() => {
    // Sin configuracion no se pide nada a Google.
    if (!adsenseActivo()) return
    // En una SPA el componente puede re-montarse; pedir el anuncio dos veces
    // para el mismo hueco lanza un error de AdSense y deja el espacio vacio.
    if (montado.current) return
    montado.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // Un bloqueador de anuncios o un fallo de red no deben romper la pagina.
    }
  }, [])

  // Sin IDs configurados no se dibuja nada: ni hueco, ni marco vacio.
  if (!adsenseActivo()) return null

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* La etiqueta va arriba y visible, aunque discreta: es lo que exige la
          politica y lo que separa "integrado" de "disfrazado". */}
      <span className="px-4 pt-3 text-[10px] uppercase tracking-wider text-white/30">
        Publicidad
      </span>
      <ins
        className="adsbygoogle block flex-1"
        style={{ display: 'block', minHeight: 240 }}
        data-ad-client={ADSENSE_PUBLISHER}
        data-ad-slot={ADSENSE_SLOT_FEED}
        data-ad-format="fluid"
        data-ad-layout-key="-fb+5w+4e-db+86"
        data-full-width-responsive="true"
      />
    </div>
  )
}
