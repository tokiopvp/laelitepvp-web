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


// ─────────────────────────────────────────────────────────────────────────
// MEDIR EN VEZ DE ADIVINAR
// ─────────────────────────────────────────────────────────────────────────
//
// La deteccion de arriba solo mira nucleos, memoria y pantalla. Eso NO ve la
// GPU, que es lo que decide si un desenfoque animado va suave o a tirones. Un
// PC de sobremesa con 8 nucleos y grafica integrada se clasifica como 'alto' y
// recibe todos los efectos: es exactamente el equipo donde la web se ve
// lagueada mientras en el de al lado vuela.
//
// Asi que despues de cargar se miden los fotogramas de verdad y, si no llegan,
// se baja de gama en caliente. Adivinar falla en el caso raro; medir no.

const CLAVE_MEDIDA = 'elite_gama_medida'

/** Baja un escalon. 'ahorro' es decision del visitante y no se toca. */
function degradar(c: Capacidades): Capacidades {
  if (c.gama === 'alto') return { gama: 'medio', particulas: 18, webgl: false, quieto: false }
  if (c.gama === 'medio') return { gama: 'bajo', particulas: 0, webgl: false, quieto: false }
  return { gama: 'bajo', particulas: 0, webgl: false, quieto: false }
}

/**
 * Mide los fotogramas y avisa si hay que bajar de gama.
 *
 * Se mide DESPUES de la carga (la primera decima de segundo siempre va a
 * trompicones por el arranque, y castigar por eso seria injusto con equipos
 * que luego van finos). Se usa la MEDIANA y no la media: un unico fotograma
 * largo por el recolector de basura no debe decidir nada.
 *
 * El resultado se guarda para la sesion: no tiene sentido volver a medir en
 * cada pagina, y ademas evita que los efectos aparezcan y desaparezcan al
 * navegar.
 */
export function medirYAjustar(
  actual: Capacidades,
  alBajar: (nueva: Capacidades) => void
): () => void {
  if (typeof window === 'undefined' || actual.quieto) return () => {}

  // Ya se midio en esta sesion: se aplica y no se vuelve a medir.
  try {
    const guardado = sessionStorage.getItem(CLAVE_MEDIDA)
    if (guardado) {
      const g = JSON.parse(guardado) as Capacidades
      if (g.gama !== actual.gama) alBajar(g)
      return () => {}
    }
  } catch {
    // Sin sessionStorage se mide otra vez; no es grave.
  }

  let raf = 0
  let temporizador = 0
  const tiempos: number[] = []
  let anterior = 0

  const tic = (ahora: number) => {
    if (anterior) tiempos.push(ahora - anterior)
    anterior = ahora
    if (tiempos.length < 90) {
      raf = requestAnimationFrame(tic)
      return
    }
    tiempos.sort((a, b) => a - b)
    const mediana = tiempos[Math.floor(tiempos.length / 2)]

    // 22 ms ≈ 45 fps. Por encima de ahi ya se nota el tiron al desplazarse.
    // No se exige 60: hay pantallas de 50 Hz y equipos que van justos pero
    // bien, y quitarles los efectos sin necesidad seria pasarse.
    if (mediana > 22) {
      const nueva = degradar(actual)
      try {
        sessionStorage.setItem(CLAVE_MEDIDA, JSON.stringify(nueva))
      } catch { /* da igual */ }
      alBajar(nueva)
    } else {
      try {
        sessionStorage.setItem(CLAVE_MEDIDA, JSON.stringify(actual))
      } catch { /* da igual */ }
    }
  }

  // Un segundo de margen para que termine el arranque.
  temporizador = window.setTimeout(() => { raf = requestAnimationFrame(tic) }, 1000)

  return () => {
    clearTimeout(temporizador)
    cancelAnimationFrame(raf)
  }
}
