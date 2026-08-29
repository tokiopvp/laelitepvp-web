'use client'

import { useEffect } from 'react'

/**
 * Avisa por Telegram cuando alguien entra al sitio.
 *
 * POR QUE ASI Y NO EN CADA CARGA
 * ------------------------------
 * El aviso solo sirve si se puede leer. Disparandolo en cada navegacion, una
 * sola persona mirando cinco paginas genera cinco mensajes, y el chat donde
 * tienen que destacar las VENTAS se vuelve ruido que se acaba silenciando.
 *
 * Tres frenos, en capas:
 *   1. Una vez por sesion de navegador (`sessionStorage`).
 *   2. El servidor limita a un aviso cada diez minutos por visitante.
 *   3. Nada de bots ni de tu propia navegacion del panel.
 *
 * Se espera a que la pagina este ociosa: un aviso no puede competir con el
 * pintado en un telefono de gama baja.
 */
const CLAVE = 'elite_visita_avisada'

export default function AvisoVisita() {
  useEffect(() => {
    let cancelado = false

    try {
      if (sessionStorage.getItem(CLAVE)) return
      // El panel es tuyo: avisarte de tu propia entrada no aporta nada.
      if (location.pathname.startsWith('/admin')) return
      // Rastreadores y previsualizaciones de enlaces no son visitas reales.
      if (/bot|crawler|spider|preview|headless/i.test(navigator.userAgent)) return
    } catch {
      return
    }

    const enviar = () => {
      if (cancelado) return
      try {
        sessionStorage.setItem(CLAVE, '1')
      } catch {
        /* modo privado: se avisa igual, solo se pierde el freno local */
      }
      // El referrer se recorta al dominio: de donde vino es util, la URL
      // completa por la que navegaba es informacion que no necesitamos.
      let origen = ''
      try {
        origen = document.referrer ? new URL(document.referrer).hostname : 'directo'
      } catch {
        origen = 'directo'
      }
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // keepalive: el aviso sale aunque cierre la pestaña acto seguido.
        keepalive: true,
        body: JSON.stringify({
          type: 'visit',
          pagina: location.pathname,
          referrer: origen,
        }),
      }).catch(() => {})
    }

    // Diez segundos de gracia: quien rebota al instante no es una visita que
    // valga la pena mirar, y asi el aviso tampoco compite con la carga.
    const t = setTimeout(enviar, 10_000)
    return () => {
      cancelado = true
      clearTimeout(t)
    }
  }, [])

  return null
}
