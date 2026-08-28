/**
 * Generador de sensibilidad. Portado de `sensi.py` del bot de ventas.
 *
 * Los valores se CALCULAN a partir de la gama del dispositivo, no se sacan de
 * una tabla de "sensis famosas". Un movil de gama baja tiene menos tasa de
 * refresco y mas retardo tactil, asi que necesita valores mas bajos para que
 * el arrastre no se pase de largo; uno de gama alta aguanta mas.
 *
 * Corre en el navegador: no hace falta servidor ni llamada a ninguna API.
 */

import { fichaDe, respuestaTactil, type FichaDispositivo } from './dispositivos'
import { calcularBoton, type ResultadoBoton } from './boton'

export type Gama = 'baja' | 'media' | 'alta'

export interface Sensi {
  general: number
  puntoRojo: number
  mira2x: number
  mira4x: number
  sniper: number
  vistaLibre: number
  dpi: number
}

export interface ResultadoSensi {
  modelo: string
  gama: Gama
  sensi: Sensi
  hud: string
  notas: string[]
  /** Medidas del telefono usadas para el calculo. */
  ficha: FichaDispositivo
  /** false si el modelo no estaba en la lista y se estimo. */
  reconocido: boolean
  /** Tamano recomendado del boton de disparo. */
  boton: ResultadoBoton
}

/** Familias conocidas y la gama a la que pertenecen. */
const FAMILIAS: { patron: RegExp; gama: Gama; etiqueta: string }[] = [
  // Gama alta: paneles de 120 Hz y de sobra de potencia.
  { patron: /iphone\s*(1[2-9]|[2-9]\d)|iphone\s*(x|xs|xr)|ipad\s*pro/i, gama: 'alta', etiqueta: 'iPhone' },
  { patron: /rog\s*phone|red\s*magic|black\s*shark|legion\s*phone/i, gama: 'alta', etiqueta: 'gaming' },
  { patron: /galaxy\s*s(2[0-9]|1[0-9])|galaxy\s*note\s*(1[0-9]|2\d)|galaxy\s*z\s*(fold|flip)/i, gama: 'alta', etiqueta: 'Galaxy S/Note' },
  { patron: /poco\s*f[1-9]|xiaomi\s*1[0-9]|mi\s*1[0-9]\b|redmi\s*k\d/i, gama: 'alta', etiqueta: 'Xiaomi alto' },
  { patron: /oneplus\s*([7-9]|1[0-9])|pixel\s*[6-9]/i, gama: 'alta', etiqueta: 'OnePlus/Pixel' },

  // Gama media: lo que juega la mayoria.
  { patron: /redmi\s*note|poco\s*x|poco\s*m|redmi\s*\d{1,2}\b/i, gama: 'media', etiqueta: 'Redmi' },
  { patron: /(galaxy|samsung)\s*a[2-7]\d|(galaxy|samsung)\s*m[1-6]\d/i, gama: 'media', etiqueta: 'Galaxy A/M' },
  { patron: /moto\s*g\s*(3[0-9]|[5-9]\d)|moto\s*g\s*(stylus|power)/i, gama: 'media', etiqueta: 'Moto G' },
  { patron: /realme\s*\d|infinix\s*(note|zero)|tecno\s*(camon|pova)/i, gama: 'media', etiqueta: 'Realme/Infinix' },
  { patron: /iphone\s*(7|8|se)/i, gama: 'media', etiqueta: 'iPhone antiguo' },

  // Gama baja: entrada, 60 Hz, poca RAM.
  { patron: /(galaxy|samsung)\s*a0\d|(galaxy|samsung)\s*a1[0-4]\b|(galaxy|samsung)\s*j\d/i, gama: 'baja', etiqueta: 'Galaxy entrada' },
  { patron: /redmi\s*(9a|9c|10a|a1|a2)|poco\s*c\d/i, gama: 'baja', etiqueta: 'Redmi entrada' },
  { patron: /moto\s*e\d|nokia\s*[cg]\d|itel|blu\s/i, gama: 'baja', etiqueta: 'entrada' },
]

/** Base por gama, antes de la variacion por modelo. */
const BASE: Record<Gama, Sensi> = {
  alta: { general: 108, puntoRojo: 102, mira2x: 96, mira4x: 92, sniper: 79, vistaLibre: 142, dpi: 500 },
  media: { general: 103, puntoRojo: 105, mira2x: 98, mira4x: 88, sniper: 78, vistaLibre: 128, dpi: 450 },
  baja: { general: 100, puntoRojo: 97, mira2x: 94, mira4x: 81, sniper: 71, vistaLibre: 105, dpi: 400 },
}

const HUD: Record<Gama, string> = {
  alta:
    'HUD compacto para 4 dedos: disparo a los dos lados, mira cerca del índice ' +
    'izquierdo y salto junto al pulgar derecho. Botones medianos: te sobra pantalla.',
  media:
    'Botón de disparo mediano a la derecha, uno secundario arriba-izquierda para ' +
    'jugar con 3 dedos. Agacharse y saltar cerca del pulgar derecho.',
  baja:
    'Botón de disparo mediano-grande a la derecha (tu pantalla responde algo más ' +
    'lento, así que prioriza acertar el toque). Salto y agacharse pegados al pulgar.',
}

/**
 * Variacion determinista por modelo.
 *
 * Dos personas con el mismo telefono reciben la MISMA sensi, pero dos modelos
 * distintos de la misma gama no reciben una copia identica. Sin esto, todas
 * las respuestas salen calcadas y se nota que es una tabla.
 */
function semilla(texto: string): number {
  let h = 0
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0
  return Math.abs(h)
}

function detectarGama(texto: string): { gama: Gama; etiqueta: string } {
  for (const f of FAMILIAS) {
    if (f.patron.test(texto)) return { gama: f.gama, etiqueta: f.etiqueta }
  }
  // Sin familia conocida: media es la apuesta segura. Es lo que mas juega y
  // los valores medios funcionan razonablemente arriba y abajo.
  return { gama: 'media', etiqueta: 'desconocido' }
}

const LIMITES: Record<keyof Sensi, [number, number]> = {
  general: [50, 200], puntoRojo: [50, 200], mira2x: [50, 200],
  mira4x: [50, 200], sniper: [50, 200], vistaLibre: [50, 200], dpi: [280, 700],
}

/**
 * Ajuste por RESPUESTA de la pantalla.
 *
 * Manda el muestreo TACTIL sobre el refresco del panel: es la tasa a la que el
 * telefono lee el dedo, y por tanto lo que decide si el arrastre se siente
 * pegado o con retardo. Un movil de 60 Hz con tactil de 120 responde mejor de
 * lo que su ficha aparenta.
 *
 * Cuanto mejor responde, mas sensibilidad se aguanta sin pasarse de largo,
 * porque la correccion llega antes.
 */
function factorRespuesta(f: FichaDispositivo): number {
  // respuestaTactil devuelve 0..1 combinando tactil, refresco y tipo de panel.
  return 1 + respuestaTactil(f) * 0.07
}

/**
 * Ajuste por TAMANO de pantalla.
 *
 * En una pantalla grande el dedo recorre mas milimetros para el mismo giro, y
 * el gesto se queda corto; en una pequeña, el mismo gesto se pasa. Por eso el
 * telefono grande pide algo mas de sensibilidad y el pequeño algo menos.
 */
function factorTamano(pulgadas: number): number {
  // 6.5" es la referencia. Cada pulgada de diferencia mueve un 4%.
  return 1 + (pulgadas - 6.5) * 0.04
}

export function generarSensi(dispositivo: string): ResultadoSensi {
  const limpio = dispositivo.trim().replace(/\s+/g, ' ')
  const { gama, etiqueta } = detectarGama(limpio)
  const base = BASE[gama]
  const s = semilla(limpio.toLowerCase())

  // Las medidas REALES del telefono, no solo su gama. Aqui es donde el
  // resultado deja de ser "una sensi de gama media" y pasa a ser la de ESE
  // telefono: entran sus pulgadas y sus hercios.
  const { ficha, reconocido } = fichaDe(limpio)
  const ajuste = factorRespuesta(ficha) * factorTamano(ficha.pulgadas)

  const sensi = {} as Sensi
  ;(Object.keys(base) as (keyof Sensi)[]).forEach((clave, i) => {
    // ±4 puntos (±20 en DPI), estable para el mismo texto.
    const rango = clave === 'dpi' ? 20 : 4
    const delta = ((s >> (i * 3)) % (rango * 2 + 1)) - rango
    const [min, max] = LIMITES[clave]
    // El DPI no se toca con estos factores: es del sistema, no del gesto.
    const conAjuste = clave === 'dpi'
      ? base[clave] + delta
      : Math.round((base[clave] + delta) * ajuste)
    sensi[clave] = Math.max(min, Math.min(max, conAjuste))
  })

  const boton = calcularBoton(ficha, 'equilibrado')

  const notas: string[] = []
  if (gama === 'baja') {
    notas.push('Baja los gráficos a Suave y desactiva sombras: ganas fluidez y el arrastre se vuelve predecible.')
  }
  if (gama === 'alta') {
    notas.push('Si tu pantalla es de 90 o 120 Hz, actívalo en los ajustes del juego: cambia más que cualquier sensi.')
  }
  notas.push('Prueba en la Sala de entrenamiento 10 minutos antes de llevarla a rankeada.')
  notas.push('Ajusta de 3 en 3 puntos, no de 20: si cambias mucho de golpe no sabes qué te ayudó.')

  // Notas que salen de las ESPECIFICACIONES, no de la gama a secas.
  if (ficha.refresco >= 120) {
    notas.unshift(
      `Tu panel va a ${ficha.refresco} Hz: actívalo en los ajustes gráficos del ` +
      'juego. Cambia más que cualquier sensibilidad.'
    )
  }
  if (ficha.tactil >= 240) {
    notas.push(
      `Con ${ficha.tactil} Hz de muestreo táctil el arrastre va pegado al dedo; ` +
      'por eso estos valores van algo por encima de la media.'
    )
  } else if (ficha.tactil <= 60) {
    notas.push(
      `Tu muestreo táctil es de ${ficha.tactil} Hz, así que estos valores van ` +
      'algo por debajo: con más, la mira se te pasaría de largo.'
    )
  }
  if (ficha.panel === 'IPS') {
    notas.push(
      'Al ser panel IPS, en giros muy rápidos verás algo de estela. Mejor ' +
      'movimientos cortos y repetidos que uno largo.'
    )
  }

  if (!reconocido) {
    notas.unshift(
      'No tengo la ficha exacta de ese modelo, así que estimé una pantalla de ' +
      '6.5". Si me dices las pulgadas, afino el cálculo.'
    )
  }

  return {
    modelo: limpio,
    gama,
    sensi,
    hud: HUD[gama],
    notas,
    ficha,
    reconocido,
    boton,
  }
}

/** Detecta si el texto trae un modelo de telefono. */
export function pareceDispositivo(texto: string): boolean {
  const t = texto.toLowerCase()
  if (FAMILIAS.some((f) => f.patron.test(t))) return true
  return /\b(iphone|samsung|galaxy|xiaomi|redmi|poco|motorola|moto|huawei|honor|realme|oppo|vivo|infinix|tecno|nokia|lg|zte|alcatel)\b/.test(t)
}

/**
 * Palabras que la gente pega al modelo y que NO forman parte de el.
 *
 * "mi galaxy s23 sensi" no es un telefono llamado "galaxy s23 sensi": hay que
 * cortar donde acaba el modelo o la ficha no se encuentra.
 */
const COLA_SOBRANTE =
  /\s+(que|cual|cuanto|cuanta|para|con|y|de|mi|el|la|un|una|sensi|sensibilidad|boton|disparo|config|configuracion|dpi|uso|pongo|dame|porfa|ayuda|tamano|tamaño)\b.*$/i

/**
 * Modelos escritos SIN la marca delante.
 *
 * En un chat la gente contesta "a54", "note 12" o "s23" a secas, porque ya
 * dijo la marca antes o porque le parece obvio. Sin esto, esas respuestas
 * cortas caian en "no lo se", que es justo cuando peor queda.
 */
const MODELOS_SUELTOS: { patron: RegExp; completo: (m: RegExpMatchArray) => string }[] = [
  { patron: /^\s*note\s*(\d{1,2})\s*(pro)?\s*$/i, completo: (m) => `redmi note ${m[1]}${m[2] ? ' pro' : ''}` },
  { patron: /^\s*a(\d{2})\s*$/i, completo: (m) => `samsung a${m[1]}` },
  { patron: /^\s*m(\d{2})\s*$/i, completo: (m) => `samsung m${m[1]}` },
  { patron: /^\s*s(\d{2})\s*(ultra|plus)?\s*$/i, completo: (m) => `galaxy s${m[1]}${m[2] ? ' ' + m[2] : ''}` },
  { patron: /^\s*(\d{1,2})\s*pro\s*max\s*$/i, completo: (m) => `iphone ${m[1]} pro max` },
  { patron: /^\s*(1[0-9])\s*pro\s*$/i, completo: (m) => `iphone ${m[1]} pro` },
  { patron: /^\s*x(\d)\s*$/i, completo: (m) => `poco x${m[1]}` },
  { patron: /^\s*f(\d)\s*$/i, completo: (m) => `poco f${m[1]}` },
  { patron: /^\s*g(\d{2})\s*$/i, completo: (m) => `moto g${m[1]}` },
]

/**
 * Ultimo recurso: algo que PARECE un telefono aunque la marca no este en la
 * lista ("Blu G91", "Cubot X30").
 *
 * Vale la pena reconocerlo: aunque no tengamos su ficha exacta, con la
 * estimacion se le puede dar una respuesta util, y eso es mejor que un
 * "no lo se" a alguien que acaba de decirnos su modelo.
 */
function pareceModeloDesconocido(texto: string): string | null {
  const t = texto.trim()
  // Dos o tres palabras cortas, al menos una con letra+numero: "Blu G91".
  if (!/^[\w\s.+-]{3,28}$/.test(t)) return null
  const palabras = t.split(/\s+/)
  if (palabras.length < 1 || palabras.length > 3) return null
  const tieneModelo = palabras.some((w) => /^[a-z]{0,4}\d{1,4}[a-z]?$/i.test(w))
  const tieneMarca = palabras.some((w) => /^[a-z]{3,10}$/i.test(w))
  return tieneModelo && tieneMarca ? t : null
}

/** Saca el modelo de una frase como "tengo un redmi note 12, que sensi uso". */
export function extraerDispositivo(texto: string): string | null {
  const m = texto.match(
    // 'samsung' a secas tiene que estar: la gente escribe "samsung a54", no
    // "samsung galaxy a54". Sin el, esa marca entera se quedaba sin reconocer.
    /\b((?:iphone|samsung|galaxy|xiaomi|redmi|poco|motorola|moto|huawei|honor|realme|oppo|vivo|infinix|tecno|nokia|zte|rog\s+phone|black\s+shark|red\s+magic|oneplus|pixel)[\w\s]{0,20})/i
  )
  if (!m) return null
  const limpio = m[1].trim().replace(COLA_SOBRANTE, '').trim()
  // "samsung" sin modelo detras no sirve para calcular nada.
  return limpio.split(/\s+/).length >= 2 || /\d/.test(limpio) ? limpio : null
}

/**
 * Extraccion CON red de seguridad, en tres pasos de menos a mas permisivo.
 *
 * Se usa esta en vez de `extraerDispositivo` en todo el flujo del chat: es la
 * que hace que responder "a54" despues de haber hablado de Samsung funcione, y
 * que un modelo raro reciba una estimacion en vez de un "no lo se".
 */
export function detectarModelo(texto: string): { modelo: string; seguro: boolean } | null {
  // 1. Marca reconocida dentro de una frase.
  const directo = extraerDispositivo(texto)
  if (directo) return { modelo: directo, seguro: true }

  // 2. Modelo suelto sin marca: "note 12", "a54", "s23".
  for (const { patron, completo } of MODELOS_SUELTOS) {
    const m = texto.match(patron)
    if (m) return { modelo: completo(m), seguro: true }
  }

  // 3. Algo con pinta de telefono aunque no conozcamos la marca.
  const raro = pareceModeloDesconocido(texto)
  if (raro) return { modelo: raro, seguro: false }

  return null
}
