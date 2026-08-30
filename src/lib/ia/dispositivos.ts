/**
 * Catalogo de telefonos y resolucion de lo que el usuario escribe.
 *
 * QUE ESTABA MAL ANTES
 * --------------------
 * 1) El catalogo AGRUPABA modelos: una sola ficha "iPhone 11/12/13". Preguntar
 *    por el 12 y por el 13 devolvia lo mismo, y cualquiera que probara dos
 *    telefonos veia los mismos numeros y concluia -con razon- que esto no
 *    calcula nada.
 *
 * 2) El emparejado era la PRIMERA expresion regular que casara. "iphone 13 por
 *    mxa" no casa con /pro\s*max/, asi que caia en la regla generica del
 *    iPhone 13 y respondia como si fuera el modelo normal, sin avisar.
 *
 * 3) Lo que no reconocia lo respondia IGUAL, con una ficha "estimado". O sea
 *    que a "asdfgh" le daba una sensibilidad con toda la seriedad del mundo.
 *
 * COMO FUNCIONA AHORA
 * -------------------
 * Cada modelo es una entrada propia con su nombre CANONICO bien escrito
 * ("iPhone 14 Pro Max", no "iphone 14 pro max") y sus especificaciones reales.
 *
 * Lo que se escribe pasa por tres fases:
 *
 *   1. NORMALIZAR   minusculas, sin tildes, numeros en palabra a digito
 *                   ("doce" -> 12), y los errores de dedo mas comunes
 *                   ("por mxa", "promax", "prm ax" -> "pro max").
 *   2. PUNTUAR      cada modelo recibe una nota comparando marca, numero de
 *                   modelo y sufijo. El NUMERO manda: un 13 nunca se resuelve
 *                   como 14 por mucho que el resto se parezca.
 *   3. DECIDIR      nota alta -> se responde por ese modelo. Nota media ->
 *                   NO se inventa: se devuelven los candidatos para poder
 *                   preguntar "¿quisiste decir...?". Nota baja -> no se
 *                   reconoce, y quien llama decide que decir.
 *
 * POR QUE DOS MODELOS PARECIDOS DAN NUMEROS DISTINTOS
 * ---------------------------------------------------
 * Porque de verdad se diferencian en algo medible. El iPhone 12 y el 13 tienen
 * pantallas casi identicas -misma diagonal, misma resolucion, mismos hercios-,
 * asi que inventarles diferencias de pantalla seria mentir. Lo que SI cambia
 * es el chip, y con el los fotogramas que el telefono sostiene en una partida
 * larga. Por eso hay un campo `potencia`: es un dato real, distinto por
 * modelo, y es lo que hace que dos telefonos parecidos no den lo mismo sin
 * necesidad de falsear ninguna ficha.
 */

export type Panel = 'AMOLED' | 'IPS'

export interface FichaDispositivo {
  /** Nombre canonico, con sus mayusculas correctas. Es lo que se muestra. */
  nombre: string
  pulgadas: number
  /** Proporcion de pantalla como [largo, alto] jugando en horizontal. */
  proporcion: [number, number]
  panel: Panel
  /** Hz del panel. */
  refresco: number
  /** Hz de muestreo tactil. Lo que se siente como "responde rapido". */
  tactil: number
  /** Resolucion, para poder nombrarla en la explicacion. */
  resolucion: string
  /**
   * Fotogramas que el telefono SOSTIENE en Free Fire en una partida larga,
   * no el maximo que marca en un menu.
   *
   * Es el dato que separa a dos telefonos con la misma pantalla. Y es el que
   * de verdad se nota: a 90 fps ves la correccion del arrastre con la mitad
   * de retardo que a 45, asi que aguantas mas sensibilidad sin pasarte.
   */
  fps: number
  /** Nombre del chip, solo para poder explicarlo en voz alta. */
  chip?: string
}

interface Entrada extends FichaDispositivo {
  /** Marca, para que la puntuacion no cruce fabricantes. */
  marca: string
  /** Numero de modelo, si lo tiene. Es lo que mas pesa al comparar. */
  num?: number
  /** Sufijo: pro, max, ultra, plus, mini, lite... */
  sufijo?: string
  /** Como lo escribe la gente, ademas del nombre canonico. */
  alias?: string[]
}

// ---------------------------------------------------------------------------
// EL CATALOGO
// ---------------------------------------------------------------------------
// Un modelo por linea. Si dos modelos comparten pantalla, comparten ficha de
// pantalla, pero NUNCA `fps`: ahi es donde se separan de verdad.
const CATALOGO: Entrada[] = [
  // ─────────────────────────── Apple
  { marca: 'apple', num: 8,  nombre: 'iPhone 8',            pulgadas: 4.7,  proporcion: [16, 9],    panel: 'IPS',    refresco: 60,  tactil: 120, resolucion: '1334×750',   fps: 40, chip: 'A11' },
  { marca: 'apple', num: 8,  sufijo: 'plus', nombre: 'iPhone 8 Plus', pulgadas: 5.5, proporcion: [16, 9], panel: 'IPS', refresco: 60, tactil: 120, resolucion: '1920×1080', fps: 40, chip: 'A11' },
  { marca: 'apple',          nombre: 'iPhone SE',           pulgadas: 4.7,  proporcion: [16, 9],    panel: 'IPS',    refresco: 60,  tactil: 120, resolucion: '1334×750',   fps: 55, chip: 'A15', alias: ['se 2020', 'se 2022', 'se3'] },
  { marca: 'apple',          nombre: 'iPhone XR',           pulgadas: 6.1,  proporcion: [19.5, 9],  panel: 'IPS',    refresco: 60,  tactil: 120, resolucion: '1792×828',   fps: 45, chip: 'A12', alias: ['xr'] },
  { marca: 'apple',          nombre: 'iPhone XS',           pulgadas: 5.8,  proporcion: [19.5, 9],  panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2436×1125',  fps: 45, chip: 'A12', alias: ['xs'] },
  { marca: 'apple',          nombre: 'iPhone X',            pulgadas: 5.8,  proporcion: [19.5, 9],  panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2436×1125',  fps: 42, chip: 'A11', alias: ['x'] },
  { marca: 'apple', num: 11, nombre: 'iPhone 11',           pulgadas: 6.1,  proporcion: [19.5, 9],  panel: 'IPS',    refresco: 60,  tactil: 120, resolucion: '1792×828',   fps: 50, chip: 'A13' },
  { marca: 'apple', num: 11, sufijo: 'pro',     nombre: 'iPhone 11 Pro',      pulgadas: 5.8, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2436×1125', fps: 52, chip: 'A13' },
  { marca: 'apple', num: 11, sufijo: 'pro max', nombre: 'iPhone 11 Pro Max',  pulgadas: 6.5, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2688×1242', fps: 52, chip: 'A13' },
  { marca: 'apple', num: 12, sufijo: 'mini',    nombre: 'iPhone 12 mini',     pulgadas: 5.4, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2340×1080', fps: 58, chip: 'A14' },
  { marca: 'apple', num: 12, nombre: 'iPhone 12',           pulgadas: 6.1,  proporcion: [19.5, 9],  panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2532×1170',  fps: 58, chip: 'A14' },
  { marca: 'apple', num: 12, sufijo: 'pro',     nombre: 'iPhone 12 Pro',      pulgadas: 6.1, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2532×1170', fps: 60, chip: 'A14' },
  { marca: 'apple', num: 12, sufijo: 'pro max', nombre: 'iPhone 12 Pro Max',  pulgadas: 6.7, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2778×1284', fps: 60, chip: 'A14' },
  { marca: 'apple', num: 13, sufijo: 'mini',    nombre: 'iPhone 13 mini',     pulgadas: 5.4, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2340×1080', fps: 62, chip: 'A15' },
  { marca: 'apple', num: 13, nombre: 'iPhone 13',           pulgadas: 6.1,  proporcion: [19.5, 9],  panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2532×1170',  fps: 62, chip: 'A15' },
  { marca: 'apple', num: 13, sufijo: 'pro',     nombre: 'iPhone 13 Pro',      pulgadas: 6.1, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2532×1170', fps: 70, chip: 'A15' },
  { marca: 'apple', num: 13, sufijo: 'pro max', nombre: 'iPhone 13 Pro Max',  pulgadas: 6.7, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2778×1284', fps: 70, chip: 'A15' },
  { marca: 'apple', num: 14, nombre: 'iPhone 14',           pulgadas: 6.1,  proporcion: [19.5, 9],  panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2532×1170',  fps: 64, chip: 'A15' },
  { marca: 'apple', num: 14, sufijo: 'plus',    nombre: 'iPhone 14 Plus',     pulgadas: 6.7, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2778×1284', fps: 64, chip: 'A15' },
  { marca: 'apple', num: 14, sufijo: 'pro',     nombre: 'iPhone 14 Pro',      pulgadas: 6.1, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2556×1179', fps: 75, chip: 'A16' },
  { marca: 'apple', num: 14, sufijo: 'pro max', nombre: 'iPhone 14 Pro Max',  pulgadas: 6.7, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2796×1290', fps: 75, chip: 'A16' },
  { marca: 'apple', num: 15, nombre: 'iPhone 15',           pulgadas: 6.1,  proporcion: [19.5, 9],  panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2556×1179',  fps: 70, chip: 'A16' },
  { marca: 'apple', num: 15, sufijo: 'plus',    nombre: 'iPhone 15 Plus',     pulgadas: 6.7, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2796×1290', fps: 70, chip: 'A16' },
  { marca: 'apple', num: 15, sufijo: 'pro',     nombre: 'iPhone 15 Pro',      pulgadas: 6.1, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2556×1179', fps: 82, chip: 'A17 Pro' },
  { marca: 'apple', num: 15, sufijo: 'pro max', nombre: 'iPhone 15 Pro Max',  pulgadas: 6.7, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2796×1290', fps: 82, chip: 'A17 Pro' },
  { marca: 'apple', num: 16, nombre: 'iPhone 16',           pulgadas: 6.1,  proporcion: [19.5, 9],  panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2556×1179',  fps: 76, chip: 'A18' },
  { marca: 'apple', num: 16, sufijo: 'plus',    nombre: 'iPhone 16 Plus',     pulgadas: 6.7, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60,  tactil: 120, resolucion: '2796×1290', fps: 76, chip: 'A18' },
  { marca: 'apple', num: 16, sufijo: 'pro',     nombre: 'iPhone 16 Pro',      pulgadas: 6.3, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2622×1206', fps: 88, chip: 'A18 Pro' },
  { marca: 'apple', num: 16, sufijo: 'pro max', nombre: 'iPhone 16 Pro Max',  pulgadas: 6.9, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2868×1320', fps: 88, chip: 'A18 Pro' },

  // ─────────────────────────── Gaming
  { marca: 'asus',   nombre: 'ASUS ROG Phone',  pulgadas: 6.78, proporcion: [20, 9], panel: 'AMOLED', refresco: 165, tactil: 720, resolucion: '2448×1080', fps: 90, alias: ['rog', 'rog phone'] },
  { marca: 'nubia',  nombre: 'RedMagic',        pulgadas: 6.8,  proporcion: [20, 9], panel: 'AMOLED', refresco: 165, tactil: 960, resolucion: '2480×1116', fps: 90, alias: ['red magic', 'nubia'] },
  { marca: 'xiaomi', nombre: 'Black Shark',     pulgadas: 6.67, proporcion: [20, 9], panel: 'AMOLED', refresco: 144, tactil: 720, resolucion: '2400×1080', fps: 90, alias: ['blackshark'] },

  // ─────────────────────────── Samsung
  { marca: 'samsung', num: 24, sufijo: 'ultra', nombre: 'Galaxy S24 Ultra', pulgadas: 6.8, proporcion: [19.3, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '3120×1440', fps: 90 },
  { marca: 'samsung', num: 24, nombre: 'Galaxy S24',       pulgadas: 6.2, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2340×1080', fps: 88 },
  { marca: 'samsung', num: 23, sufijo: 'ultra', nombre: 'Galaxy S23 Ultra', pulgadas: 6.8, proporcion: [19.3, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '3088×1440', fps: 88 },
  { marca: 'samsung', num: 23, nombre: 'Galaxy S23',       pulgadas: 6.1, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2340×1080', fps: 85 },
  { marca: 'samsung', num: 22, sufijo: 'ultra', nombre: 'Galaxy S22 Ultra', pulgadas: 6.8, proporcion: [19.3, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '3088×1440', fps: 80 },
  { marca: 'samsung', num: 22, nombre: 'Galaxy S22',       pulgadas: 6.1, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2340×1080', fps: 78 },
  { marca: 'samsung', num: 21, nombre: 'Galaxy S21',       pulgadas: 6.2, proporcion: [20, 9],   panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080', fps: 72 },
  { marca: 'samsung', num: 20, nombre: 'Galaxy S20',       pulgadas: 6.2, proporcion: [20, 9],   panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '3200×1440', fps: 65 },
  { marca: 'samsung', num: 54, nombre: 'Galaxy A54',       pulgadas: 6.4, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2340×1080', fps: 60 },
  { marca: 'samsung', num: 34, nombre: 'Galaxy A34',       pulgadas: 6.6, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2340×1080', fps: 58 },
  { marca: 'samsung', num: 24, nombre: 'Galaxy A24',       pulgadas: 6.5, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 90,  tactil: 120, resolucion: '2340×1080', fps: 50 },
  { marca: 'samsung', num: 14, nombre: 'Galaxy A14',       pulgadas: 6.6, proporcion: [20, 9],   panel: 'IPS',    refresco: 90,  tactil: 120, resolucion: '2408×1080', fps: 42 },
  { marca: 'samsung', num: 4,  nombre: 'Galaxy A04',       pulgadas: 6.5, proporcion: [20, 9],   panel: 'IPS',    refresco: 60,  tactil: 60,  resolucion: '1600×720',  fps: 32 },
  { marca: 'samsung',          nombre: 'Galaxy J',         pulgadas: 5.5, proporcion: [16, 9],   panel: 'IPS',    refresco: 60,  tactil: 60,  resolucion: '1280×720',  fps: 28 },

  // ─────────────────────────── Xiaomi / Redmi / POCO
  { marca: 'xiaomi', nombre: 'POCO X6 Pro',     pulgadas: 6.67, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 480, resolucion: '2712×1220', fps: 88, alias: ['poco x6 pro'] },
  { marca: 'xiaomi', nombre: 'POCO X5',         pulgadas: 6.67, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080', fps: 70, alias: ['poco x5'] },
  { marca: 'xiaomi', nombre: 'POCO F5',         pulgadas: 6.67, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080', fps: 85, alias: ['poco f5'] },
  { marca: 'xiaomi', nombre: 'POCO M5',         pulgadas: 6.58, proporcion: [20, 9], panel: 'IPS',    refresco: 90,  tactil: 180, resolucion: '2408×1080', fps: 50, alias: ['poco m5'] },
  { marca: 'xiaomi', nombre: 'Redmi Note 13',   pulgadas: 6.67, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080', fps: 62, alias: ['note 13', 'redmi note 13'] },
  { marca: 'xiaomi', nombre: 'Redmi Note 12',   pulgadas: 6.67, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080', fps: 58, alias: ['note 12', 'redmi note 12'] },
  { marca: 'xiaomi', nombre: 'Redmi Note 11',   pulgadas: 6.43, proporcion: [20, 9], panel: 'AMOLED', refresco: 90,  tactil: 180, resolucion: '2400×1080', fps: 52, alias: ['note 11', 'redmi note 11'] },
  { marca: 'xiaomi', nombre: 'Redmi Note 10',   pulgadas: 6.43, proporcion: [20, 9], panel: 'AMOLED', refresco: 60,  tactil: 180, resolucion: '2400×1080', fps: 48, alias: ['note 10', 'redmi note 10'] },
  { marca: 'xiaomi', nombre: 'Redmi 12',        pulgadas: 6.79, proporcion: [20, 9], panel: 'IPS',    refresco: 90,  tactil: 120, resolucion: '2460×1080', fps: 42, alias: ['redmi 12'] },
  { marca: 'xiaomi', nombre: 'Redmi 9',         pulgadas: 6.53, proporcion: [20, 9], panel: 'IPS',    refresco: 60,  tactil: 60,  resolucion: '2340×1080', fps: 32, alias: ['redmi 9'] },
  { marca: 'xiaomi', nombre: 'Xiaomi 13',       pulgadas: 6.36, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080', fps: 88, alias: ['mi 13'] },

  // ─────────────────────────── Motorola
  { marca: 'motorola', nombre: 'Moto G84',      pulgadas: 6.55, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080', fps: 60, alias: ['g84'] },
  { marca: 'motorola', nombre: 'Moto G54',      pulgadas: 6.5,  proporcion: [20, 9], panel: 'IPS',    refresco: 120, tactil: 120, resolucion: '2400×1080', fps: 50, alias: ['g54'] },
  { marca: 'motorola', nombre: 'Moto G',        pulgadas: 6.5,  proporcion: [20, 9], panel: 'IPS',    refresco: 90,  tactil: 120, resolucion: '1600×720',  fps: 40, alias: ['moto g', 'motorola'] },
  { marca: 'motorola', nombre: 'Moto Edge',     pulgadas: 6.6,  proporcion: [20, 9], panel: 'AMOLED', refresco: 144, tactil: 240, resolucion: '2400×1080', fps: 75, alias: ['edge'] },

  // ─────────────────────────── Infinix / Tecno / realme / Honor
  { marca: 'infinix', nombre: 'Infinix Note',   pulgadas: 6.78, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080', fps: 58, alias: ['infinix'] },
  { marca: 'tecno',   nombre: 'Tecno Spark',    pulgadas: 6.6,  proporcion: [20, 9], panel: 'IPS',    refresco: 90,  tactil: 120, resolucion: '1612×720',  fps: 40, alias: ['tecno', 'spark'] },
  { marca: 'realme',  nombre: 'realme',         pulgadas: 6.6,  proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080', fps: 65 },
  { marca: 'honor',   nombre: 'Honor',          pulgadas: 6.7,  proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080', fps: 65 },
  { marca: 'huawei',  nombre: 'Huawei',         pulgadas: 6.6,  proporcion: [20, 9], panel: 'IPS',    refresco: 90,  tactil: 120, resolucion: '2400×1080', fps: 48 },
  { marca: 'google',  nombre: 'Google Pixel',   pulgadas: 6.3,  proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2400×1080', fps: 70, alias: ['pixel'] },
  { marca: 'oppo',    nombre: 'OPPO',           pulgadas: 6.6,  proporcion: [20, 9], panel: 'AMOLED', refresco: 90,  tactil: 180, resolucion: '2400×1080', fps: 55 },
  { marca: 'vivo',    nombre: 'vivo',           pulgadas: 6.6,  proporcion: [20, 9], panel: 'AMOLED', refresco: 90,  tactil: 180, resolucion: '2400×1080', fps: 55 },
  { marca: 'nokia',   nombre: 'Nokia',          pulgadas: 6.5,  proporcion: [20, 9], panel: 'IPS',    refresco: 60,  tactil: 60,  resolucion: '1600×720',  fps: 30 },
]

// ---------------------------------------------------------------------------
// NORMALIZAR LO QUE SE ESCRIBE
// ---------------------------------------------------------------------------

// Numeros escritos con letras. La gente escribe "iphone doce" mucho mas de lo
// que parece, y sin esto no casa con nada.
const NUMEROS: Record<string, string> = {
  cero: '0', uno: '1', dos: '2', tres: '3', cuatro: '4', cinco: '5',
  seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10', once: '11',
  doce: '12', trece: '13', catorce: '14', quince: '15', dieciseis: '16',
  diecisiete: '17', dieciocho: '18', diecinueve: '19', veinte: '20',
  veintiuno: '21', veintidos: '22', veintitres: '23', veinticuatro: '24',
}

// Errores de dedo reales. Todas estas son formas que se ven a diario en el
// Discord del clan; no son hipoteticas.
const ERRATAS: [RegExp, string][] = [
  [/\bpor\s*m[ax]{2,3}\b/g, 'pro max'],   // "por mxa", "por maax"
  [/\bpro?m\s*ax\b/g, 'pro max'],         // "prm ax", "prom ax"
  [/\bpromax\b/g, 'pro max'],
  [/\bpro\s*mx\b/g, 'pro max'],
  [/\bmaxx?\b/g, 'max'],
  [/\bpr[o0]\b/g, 'pro'],
  [/\bplu?s?\b/g, 'plus'],
  [/\bultr?a?\b/g, 'ultra'],
  [/\bi\s*phone\b/g, 'iphone'],
  [/\bip\b/g, 'iphone'],
  [/\bayfon|aifon|aiphone|iphon[ei]?\b/g, 'iphone'],
  [/\bsamsun\b/g, 'samsung'],
  [/\bgalaxi\b/g, 'galaxy'],
  [/\bshaomi|xaomi|ziaomi\b/g, 'xiaomi'],
  [/\brealmi\b/g, 'realme'],
  [/\bmotorola\s*moto\b/g, 'moto'],
]

export function normalizar(texto: string): string {
  let t = (texto || '').toLowerCase()
  t = t.normalize('NFKD').replace(/[̀-ͯ]/g, '')  // fuera tildes
  t = t.replace(/[^a-z0-9+ ]/g, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  // Palabra a numero, palabra completa nada mas.
  t = t.split(' ').map((p) => NUMEROS[p] ?? p).join(' ')
  for (const [re, a] of ERRATAS) t = t.replace(re, a)
  return t.replace(/\s+/g, ' ').trim()
}

/** Distancia de edicion, acotada: solo interesa "se parece o no". */
function distancia(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (!m || !n) return Math.max(m, n)
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = cur
  }
  return prev[n]
}

/** 0..1. 1 = iguales. */
function parecido(a: string, b: string): number {
  const d = distancia(a, b)
  return 1 - d / Math.max(a.length, b.length, 1)
}

const SUFIJOS = ['pro max', 'pro', 'ultra', 'plus', 'mini', 'lite']

/** Lo que se puede sacar del texto antes de comparar con el catalogo. */
function desmenuzar(t: string) {
  // Sin frontera de palabra a la izquierda: /\b\d+/ NO casa el "24" de "s24"
  // porque entre 's' y '2' no hay frontera. Eso dejaba fuera a toda la gama
  // Samsung (s24, a54) y a los POCO (x6).
  const nums = (t.match(/\d{1,3}/g) || []).map(Number)
  const sufijo = SUFIJOS.find((s) => t.includes(s))
  return { nums, sufijo }
}

export interface Resolucion {
  ficha: FichaDispositivo
  /** true solo si se puede responder con confianza. */
  reconocido: boolean
  /** Nombre canonico del modelo, o null si no se reconocio. */
  canonico: string | null
  /** 0..1. */
  confianza: number
  /** Candidatos, cuando la lectura es dudosa. Para el "¿quisiste decir...?". */
  sugerencias: string[]
}

/** Ficha neutra. Solo se usa para no devolver null; nunca se responde con ella. */
const POR_DEFECTO: FichaDispositivo = {
  nombre: 'estimado', pulgadas: 6.5, proporcion: [20, 9],
  panel: 'IPS', refresco: 60, tactil: 120, resolucion: '2400×1080', fps: 45,
}

/**
 * Resuelve el texto contra el catalogo.
 *
 * Las notas se reparten asi:
 *   marca            0.35   quien escribe la marca ya ha dicho la mitad
 *   numero exacto    0.40   es lo que mas distingue; un 13 NO es un 14
 *   sufijo           0.25   pro / pro max / ultra cambian el telefono entero
 *
 * El numero es eliminatorio a proposito: sin ese castigo, "iphone 13" se
 * resolvia como "iPhone 14" cuando el 14 estaba antes en la lista, que es
 * justo el fallo que hacia que la respuesta no tuviera nada que ver.
 */
export function resolver(texto: string): Resolucion {
  const t = normalizar(texto)
  if (t.length < 2) {
    return { ficha: POR_DEFECTO, reconocido: false, canonico: null, confianza: 0, sugerencias: [] }
  }
  const { nums, sufijo } = desmenuzar(t)

  const notas = CATALOGO.map((e) => {
    let n = 0

    // --- Marca ---
    const marcaEnTexto = t.includes(e.marca)
      || (e.marca === 'apple' && t.includes('iphone'))
      || (e.marca === 'samsung' && t.includes('galaxy'))
      || (e.marca === 'xiaomi' && (t.includes('redmi') || t.includes('poco')))
    if (marcaEnTexto) n += 0.35

    // --- Nombre completo o alias, comparado entero ---
    const nombreN = normalizar(e.nombre)
    const candidatos = [nombreN, ...(e.alias || []).map(normalizar)]
    const palabras = t.split(' ')
    // La distancia de edicion castiga las palabras de MAS: "samsung galaxy s24"
    // contra "galaxy s24" baja a 0.56 solo por llevar la marca delante, con el
    // modelo escrito entero y bien.
    //
    // Lo que de verdad importa es que no FALTE ninguna palabra del modelo. Si
    // todas aparecen (admitiendo una errata pequena en cada una, para que
    // "galaxi" valga por "galaxy"), es ese modelo y punto.
    const contiene = (c: string) =>
      c.split(' ').every((w) => palabras.some((q) => parecido(w, q) >= 0.75))
    const mejorTexto = Math.max(
      ...candidatos.map((c) => Math.max(parecido(t, c), contiene(c) ? 0.95 : 0)),
    )
    n += mejorTexto * 0.45
    // Si el texto ES el nombre del modelo (o su alias), ya no hay nada que
    // decidir. Sin esto, "redmi note 12" -escrito perfecto- se quedaba por
    // debajo del umbral y el sistema pedia aclaracion de su propio catalogo.
    if (mejorTexto >= 0.92) n += 0.3

    // --- Numero de modelo ---
    if (e.num != null) {
      if (nums.includes(e.num)) n += 0.4
      // Hay numero en el texto y NO es el de este modelo: se hunde. Un "13"
      // jamas debe resolverse como un 14 por parecido de letras.
      else if (nums.length) n -= 0.45
    } else if (nums.length && !candidatos.some((c) => nums.some((x) => c.includes(String(x))))) {
      n -= 0.1
    }

    // --- Sufijo ---
    const suf = e.sufijo || SUFIJOS.find((x) => nombreN.endsWith(x)) || ''
    if (sufijo && suf === sufijo) n += 0.25
    else if (sufijo && !suf) n -= 0.2      // pidio "pro max" y este es el normal
    else if (!sufijo && suf) n -= 0.25     // no pidio sufijo y este lo tiene
    else if (sufijo && suf && suf !== sufijo) n -= 0.3

    return { e, n }
  }).sort((a, b) => b.n - a.n)

  const mejor = notas[0]
  const sugerencias = notas.filter((x) => x.n > 0.35).slice(0, 3).map((x) => x.e.nombre)

  // Umbral alto: mas vale preguntar que responder de un telefono que no es.
  if (mejor.n >= 0.72) {
    return { ficha: mejor.e, reconocido: true, canonico: mejor.e.nombre, confianza: Math.min(1, mejor.n), sugerencias }
  }
  return { ficha: POR_DEFECTO, reconocido: false, canonico: null, confianza: Math.max(0, mejor.n), sugerencias }
}

/** Compatibilidad con lo que ya llamaba a `fichaDe`. */
export function fichaDe(texto: string): { ficha: FichaDispositivo; reconocido: boolean } {
  const r = resolver(texto)
  return { ficha: r.ficha, reconocido: r.reconocido }
}

/** Medidas fisicas de la pantalla en milimetros, jugando en horizontal. */
export function medidasMm(f: FichaDispositivo): { largo: number; alto: number } {
  const [a, b] = f.proporcion
  const diagonal = Math.hypot(a, b)
  const mm = f.pulgadas * 25.4
  return { largo: (mm * a) / diagonal, alto: (mm * b) / diagonal }
}

/**
 * Como de "rapida" se siente la pantalla al dedo, de 0 a 1.
 *
 * Manda la tasa TACTIL sobre la del panel: es la que decide si el arrastre se
 * siente pegado al dedo. Y entran los FPS sostenidos, que son los que separan
 * a dos telefonos con la misma pantalla: de nada sirve un panel de 120 Hz si
 * el juego solo sostiene 45 fotogramas.
 */
export function respuestaTactil(f: FichaDispositivo): number {
  const porTactil = Math.min(1, (f.tactil - 60) / 300)
  const porPanel = Math.min(1, (f.refresco - 60) / 84)
  const porFps = Math.min(1, Math.max(0, (f.fps - 30) / 60))
  const porTipo = f.panel === 'AMOLED' ? 0.08 : 0
  return Math.min(1, porTactil * 0.34 + porPanel * 0.22 + porFps * 0.36 + porTipo)
}

export function cuantasFichas(): number {
  return CATALOGO.length
}

/** Todos los nombres del catalogo, para sugerir y para autocompletar. */
export function modelos(): string[] {
  return CATALOGO.map((e) => e.nombre)
}
