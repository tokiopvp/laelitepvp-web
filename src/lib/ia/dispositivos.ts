/**
 * Fichas de dispositivos: lo que hace falta para CALCULAR y para EXPLICAR.
 *
 * No hay aqui ninguna "sensi famosa" copiada de un grupo. Hay especificaciones:
 * pulgadas, tipo de panel, resolucion, refresco y tasa de muestreo tactil. Con
 * eso se calcula el boton y la sensibilidad, y ademas se puede RAZONAR la
 * respuesta en voz alta: "tu panel es AMOLED de 120 Hz, por eso...".
 *
 * Por que cada dato importa
 * -------------------------
 *   PULGADAS   El mismo porcentaje de boton da un boton fisico distinto en
 *              6.1" que en 6.8". El dedo mide lo mismo en ambos.
 *   PANEL      El AMOLED responde al toque algo antes que el IPS y no deja
 *              estela en movimientos rapidos. En IPS conviene bajar un punto.
 *   REFRESCO   A 120 Hz ves la correccion del arrastre el doble de veces por
 *              segundo, asi que aguantas mas sensibilidad sin pasarte.
 *   TACTIL     La tasa de muestreo (Hz de lectura del dedo) es lo que de
 *              verdad decide si el arrastre se siente pegado o con retardo.
 *              Un panel de 60 Hz con tactil de 120 responde mejor de lo que
 *              su ficha sugiere.
 */

export type Panel = 'AMOLED' | 'IPS'

export interface FichaDispositivo {
  nombre: string
  pulgadas: number
  /** Proporcion de pantalla como [largo, alto] jugando en horizontal. */
  proporcion: [number, number]
  panel: Panel
  /** Hz del panel. */
  refresco: number
  /** Hz de muestreo tactil. Lo que se siente como "responde rapido". */
  tactil: number
  /** Resolucion en horizontal, para poder nombrarla. */
  resolucion: string
}

const FICHAS: { patron: RegExp; ficha: FichaDispositivo }[] = [
  // ─────────────────────────── Apple
  { patron: /iphone\s*1[5-7]\s*pro\s*max/i, ficha: { nombre: 'iPhone 15/16 Pro Max', pulgadas: 6.7, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2796×1290' } },
  { patron: /iphone\s*1[5-7]\s*pro/i, ficha: { nombre: 'iPhone 15/16 Pro', pulgadas: 6.1, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2556×1179' } },
  { patron: /iphone\s*1[4-7]\s*(plus|max)/i, ficha: { nombre: 'iPhone Plus', pulgadas: 6.7, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60, tactil: 120, resolucion: '2778×1284' } },
  { patron: /iphone\s*1[4-7]/i, ficha: { nombre: 'iPhone 14/15/16', pulgadas: 6.1, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60, tactil: 120, resolucion: '2532×1170' } },
  { patron: /iphone\s*1[23]\s*(pro\s*max|max)/i, ficha: { nombre: 'iPhone 12/13 Pro Max', pulgadas: 6.7, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2778×1284' } },
  { patron: /iphone\s*1[23]\s*pro/i, ficha: { nombre: 'iPhone 12/13 Pro', pulgadas: 6.1, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2532×1170' } },
  { patron: /iphone\s*1[23]\s*mini/i, ficha: { nombre: 'iPhone mini', pulgadas: 5.4, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60, tactil: 120, resolucion: '2340×1080' } },
  { patron: /iphone\s*1[123]/i, ficha: { nombre: 'iPhone 11/12/13', pulgadas: 6.1, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60, tactil: 120, resolucion: '2532×1170' } },
  { patron: /iphone\s*(x|xs|xr)/i, ficha: { nombre: 'iPhone X/XS/XR', pulgadas: 5.8, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 60, tactil: 120, resolucion: '2436×1125' } },
  { patron: /iphone\s*se/i, ficha: { nombre: 'iPhone SE', pulgadas: 4.7, proporcion: [16, 9], panel: 'IPS', refresco: 60, tactil: 120, resolucion: '1334×750' } },
  { patron: /iphone\s*[78]/i, ficha: { nombre: 'iPhone 7/8', pulgadas: 4.7, proporcion: [16, 9], panel: 'IPS', refresco: 60, tactil: 120, resolucion: '1334×750' } },

  // ─────────────────────────── Gaming
  { patron: /rog\s*phone/i, ficha: { nombre: 'ASUS ROG Phone', pulgadas: 6.78, proporcion: [20, 9], panel: 'AMOLED', refresco: 165, tactil: 720, resolucion: '2448×1080' } },
  { patron: /red\s*magic/i, ficha: { nombre: 'RedMagic', pulgadas: 6.8, proporcion: [20, 9], panel: 'AMOLED', refresco: 165, tactil: 960, resolucion: '2480×1116' } },
  { patron: /black\s*shark/i, ficha: { nombre: 'Black Shark', pulgadas: 6.67, proporcion: [20, 9], panel: 'AMOLED', refresco: 144, tactil: 720, resolucion: '2400×1080' } },

  // ─────────────────────────── Samsung
  { patron: /(galaxy|samsung)\s*s2[2-9].*ultra/i, ficha: { nombre: 'Galaxy S Ultra', pulgadas: 6.8, proporcion: [19.3, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '3088×1440' } },
  { patron: /(galaxy|samsung)\s*s2[2-9]/i, ficha: { nombre: 'Galaxy S', pulgadas: 6.2, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2340×1080' } },
  { patron: /(galaxy|samsung)\s*s(1[0-9]|2[01])/i, ficha: { nombre: 'Galaxy S (gen anterior)', pulgadas: 6.2, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080' } },
  { patron: /(galaxy|samsung)\s*a[5-7]\d/i, ficha: { nombre: 'Galaxy A5x/A7x', pulgadas: 6.4, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2340×1080' } },
  { patron: /(galaxy|samsung)\s*a3[0-9]/i, ficha: { nombre: 'Galaxy A3x', pulgadas: 6.4, proporcion: [19.5, 9], panel: 'AMOLED', refresco: 90, tactil: 120, resolucion: '2340×1080' } },
  { patron: /(galaxy|samsung)\s*a2[0-9]/i, ficha: { nombre: 'Galaxy A2x', pulgadas: 6.6, proporcion: [20, 9], panel: 'IPS', refresco: 90, tactil: 120, resolucion: '2408×1080' } },
  { patron: /(galaxy|samsung)\s*a1[0-9]/i, ficha: { nombre: 'Galaxy A1x', pulgadas: 6.5, proporcion: [20, 9], panel: 'IPS', refresco: 60, tactil: 60, resolucion: '1600×720' } },
  { patron: /(galaxy|samsung)\s*a0[0-9]/i, ficha: { nombre: 'Galaxy A0x', pulgadas: 6.5, proporcion: [20, 9], panel: 'IPS', refresco: 60, tactil: 60, resolucion: '1600×720' } },
  { patron: /(galaxy|samsung)\s*m[1-6]\d/i, ficha: { nombre: 'Galaxy M', pulgadas: 6.6, proporcion: [20, 9], panel: 'AMOLED', refresco: 90, tactil: 120, resolucion: '2408×1080' } },
  { patron: /(galaxy|samsung)\s*j\d/i, ficha: { nombre: 'Galaxy J', pulgadas: 5.5, proporcion: [16, 9], panel: 'IPS', refresco: 60, tactil: 60, resolucion: '1280×720' } },

  // ─────────────────────────── Xiaomi / Redmi / POCO
  { patron: /redmi\s*note\s*1[0-9]\s*pro/i, ficha: { nombre: 'Redmi Note Pro', pulgadas: 6.67, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080' } },
  { patron: /redmi\s*note\s*1[0-9]/i, ficha: { nombre: 'Redmi Note', pulgadas: 6.67, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 180, resolucion: '2400×1080' } },
  { patron: /redmi\s*note\s*[89]/i, ficha: { nombre: 'Redmi Note 8/9', pulgadas: 6.53, proporcion: [19.5, 9], panel: 'IPS', refresco: 60, tactil: 120, resolucion: '2340×1080' } },
  { patron: /poco\s*f\d/i, ficha: { nombre: 'POCO F', pulgadas: 6.67, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 360, resolucion: '2400×1080' } },
  { patron: /poco\s*x\d/i, ficha: { nombre: 'POCO X', pulgadas: 6.67, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080' } },
  { patron: /poco\s*m\d/i, ficha: { nombre: 'POCO M', pulgadas: 6.58, proporcion: [20, 9], panel: 'IPS', refresco: 90, tactil: 180, resolucion: '2408×1080' } },
  { patron: /poco\s*c\d/i, ficha: { nombre: 'POCO C', pulgadas: 6.52, proporcion: [20, 9], panel: 'IPS', refresco: 60, tactil: 60, resolucion: '1600×720' } },
  { patron: /redmi\s*(9a|9c|10a|12c|a[1-3])/i, ficha: { nombre: 'Redmi serie A/C', pulgadas: 6.53, proporcion: [20, 9], panel: 'IPS', refresco: 60, tactil: 60, resolucion: '1600×720' } },
  { patron: /xiaomi\s*1[0-9]|mi\s*1[0-9]\b/i, ficha: { nombre: 'Xiaomi buque insignia', pulgadas: 6.67, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 480, resolucion: '2400×1080' } },
  { patron: /redmi\s*\d{1,2}\b/i, ficha: { nombre: 'Redmi', pulgadas: 6.6, proporcion: [20, 9], panel: 'IPS', refresco: 90, tactil: 120, resolucion: '2408×1080' } },

  // ─────────────────────────── Motorola
  { patron: /moto\s*g\s*(7[0-9]|8[0-9]|9[0-9])/i, ficha: { nombre: 'Moto G (gama media)', pulgadas: 6.5, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080' } },
  { patron: /moto\s*g/i, ficha: { nombre: 'Moto G', pulgadas: 6.5, proporcion: [20, 9], panel: 'IPS', refresco: 90, tactil: 120, resolucion: '1600×720' } },
  { patron: /moto\s*(edge|razr)/i, ficha: { nombre: 'Motorola Edge', pulgadas: 6.7, proporcion: [20, 9], panel: 'AMOLED', refresco: 144, tactil: 360, resolucion: '2400×1080' } },
  { patron: /moto\s*e/i, ficha: { nombre: 'Moto E', pulgadas: 6.5, proporcion: [20, 9], panel: 'IPS', refresco: 60, tactil: 60, resolucion: '1600×720' } },

  // ─────────────────────────── Otros
  { patron: /realme\s*(gt|c\d)/i, ficha: { nombre: 'Realme', pulgadas: 6.6, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080' } },
  { patron: /realme/i, ficha: { nombre: 'Realme', pulgadas: 6.6, proporcion: [20, 9], panel: 'IPS', refresco: 90, tactil: 180, resolucion: '2408×1080' } },
  { patron: /infinix|tecno/i, ficha: { nombre: 'Infinix / Tecno', pulgadas: 6.6, proporcion: [20, 9], panel: 'IPS', refresco: 90, tactil: 180, resolucion: '2408×1080' } },
  { patron: /honor\s*\d/i, ficha: { nombre: 'Honor', pulgadas: 6.7, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2400×1080' } },
  { patron: /huawei|nova\s*\d/i, ficha: { nombre: 'Huawei', pulgadas: 6.6, proporcion: [20, 9], panel: 'IPS', refresco: 90, tactil: 180, resolucion: '2400×1080' } },
  { patron: /oneplus/i, ficha: { nombre: 'OnePlus', pulgadas: 6.7, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 240, resolucion: '2412×1080' } },
  { patron: /pixel\s*[6-9]/i, ficha: { nombre: 'Google Pixel', pulgadas: 6.3, proporcion: [20, 9], panel: 'AMOLED', refresco: 120, tactil: 120, resolucion: '2400×1080' } },
  { patron: /oppo|vivo/i, ficha: { nombre: 'OPPO / vivo', pulgadas: 6.6, proporcion: [20, 9], panel: 'AMOLED', refresco: 90, tactil: 180, resolucion: '2400×1080' } },
  { patron: /nokia/i, ficha: { nombre: 'Nokia', pulgadas: 6.5, proporcion: [20, 9], panel: 'IPS', refresco: 60, tactil: 60, resolucion: '1600×720' } },
]

/** Ficha por defecto cuando el modelo no se reconoce. */
const POR_DEFECTO: FichaDispositivo = {
  nombre: 'estimado', pulgadas: 6.5, proporcion: [20, 9],
  panel: 'IPS', refresco: 60, tactil: 120, resolucion: '2400×1080',
}

export function fichaDe(texto: string): { ficha: FichaDispositivo; reconocido: boolean } {
  for (const f of FICHAS) {
    if (f.patron.test(texto)) return { ficha: f.ficha, reconocido: true }
  }
  return { ficha: POR_DEFECTO, reconocido: false }
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
 * siente pegado al dedo. Un movil de 60 Hz con tactil de 120 responde mejor de
 * lo que su ficha aparenta, y al reves.
 */
export function respuestaTactil(f: FichaDispositivo): number {
  const porTactil = Math.min(1, (f.tactil - 60) / 300)
  const porPanel = Math.min(1, (f.refresco - 60) / 84)
  const porTipo = f.panel === 'AMOLED' ? 0.1 : 0
  return Math.min(1, porTactil * 0.55 + porPanel * 0.35 + porTipo)
}

export function cuantasFichas(): number {
  return FICHAS.length
}
