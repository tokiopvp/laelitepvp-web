'use client'

/**
 * Gama del dispositivo, para decidir cuanto efecto servir.
 *
 * La audiencia de Free Fire en Latinoamerica juega en gama media-baja. Si la
 * portada exige GPU se pierde justo al publico objetivo, asi que nada se sirve
 * por igual a todos: se detecta y se degrada.
 *
 *   alto   -> WebGL completo, particulas, parallax
 *   medio  -> WebGL simple, sin post-proceso
 *   bajo   -> imagen estatica + CSS, cero WebGL
 *   ahorro -> todo quieto (reduced-motion o bateria baja)
 */
export type Gama = 'alto' | 'medio' | 'bajo' | 'ahorro'

export interface Capacidades {
  gama: Gama
  /** Cuantas particulas puede dibujar sin sufrir. 0 = ninguna. */
  particulas: number
  /** Si vale la pena montar una escena WebGL. */
  webgl: boolean
  /** El visitante pidio que nada se mueva. */
  quieto: boolean
}

const AHORRO: Capacidades = { gama: 'ahorro', particulas: 0, webgl: false, quieto: true }

/**
 * Se mide una sola vez por carga. En servidor devuelve la gama mas baja: el
 * export estatico se pinta sin JS y no debe prometer efectos que aun no puede
 * medir.
 */
export function detectarGama(): Capacidades {
  if (typeof window === 'undefined') {
    return { gama: 'bajo', particulas: 0, webgl: false, quieto: false }
  }

  // Quien pidio menos movimiento manda sobre cualquier otra medida.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return AHORRO

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  // Modo ahorro de datos: tampoco conviene gastar en efectos.
  if (nav.connection?.saveData) return AHORRO

  const nucleos = nav.hardwareConcurrency ?? 4
  // deviceMemory solo existe en Chromium; donde no esta, no penalizamos.
  const memoria = nav.deviceMemory ?? 8
  const ancho = window.screen?.width ?? 1024
  const tactil = window.matchMedia('(pointer: coarse)').matches

  if (nucleos < 4 || memoria < 4) {
    return { gama: 'bajo', particulas: 0, webgl: false, quieto: false }
  }
  if (nucleos >= 8 && !tactil && ancho >= 1280) {
    return { gama: 'alto', particulas: 48, webgl: true, quieto: false }
  }
  return { gama: 'medio', particulas: 18, webgl: false, quieto: false }
}
