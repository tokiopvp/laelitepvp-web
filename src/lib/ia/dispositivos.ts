/**
 * Fichas de dispositivos: lo que hace falta para CALCULAR, no para copiar.
 *
 * No hay aqui ninguna "sensi famosa" sacada de un grupo. Hay medidas: pulgadas
 * de pantalla, proporcion y tasa de refresco. Con eso se calcula el tamaño
 * fisico del boton y la sensibilidad, y el resultado sirve tambien para
 * telefonos que no esten en esta lista, porque lo que se estima es la MEDIDA,
 * no el modelo.
 *
 * Por que estas tres cosas y no otras:
 *   - PULGADAS: el mismo porcentaje de boton da un boton fisico distinto en
 *     una pantalla de 6.1" que en una de 6.8". El dedo mide lo mismo en las
 *     dos, asi que el porcentaje tiene que cambiar.
 *   - PROPORCION: una pantalla 20:9 es mas estrecha de alto en horizontal que
 *     una 16:9, y el alto es lo que limita donde cabe el pulgar.
 *   - REFRESCO: a 120 Hz el arrastre se corrige antes, asi que se aguanta mas
 *     sensibilidad sin pasarse de largo.
 */

export interface FichaDispositivo {
  /** Diagonal en pulgadas. */
  pulgadas: number
  /** Proporcion de pantalla, como [ancho, alto] en horizontal. */
  proporcion: [number, number]
  /** Hz reales del panel. */
  refresco: number
  /** Nombre bonito para mostrar. */
  nombre: string
}

/**
 * Modelos con ficha conocida. La lista no pretende ser completa: es un atajo
 * para no estimar cuando el dato exacto se sabe.
 */
const FICHAS: { patron: RegExp; ficha: FichaDispositivo }[] = [
  // ── Apple
  { patron: /iphone\s*(15|16)\s*pro\s*max/i, ficha: { pulgadas: 6.7, proporcion: [19.5, 9], refresco: 120, nombre: 'iPhone Pro Max' } },
  { patron: /iphone\s*(15|16)\s*pro/i, ficha: { pulgadas: 6.1, proporcion: [19.5, 9], refresco: 120, nombre: 'iPhone Pro' } },
  { patron: /iphone\s*(1[3-6])\b/i, ficha: { pulgadas: 6.1, proporcion: [19.5, 9], refresco: 60, nombre: 'iPhone' } },
  { patron: /iphone\s*1[12]\b/i, ficha: { pulgadas: 6.1, proporcion: [19.5, 9], refresco: 60, nombre: 'iPhone' } },
  { patron: /iphone\s*(x|xs|xr)/i, ficha: { pulgadas: 5.8, proporcion: [19.5, 9], refresco: 60, nombre: 'iPhone X' } },
  { patron: /iphone\s*se/i, ficha: { pulgadas: 4.7, proporcion: [16, 9], refresco: 60, nombre: 'iPhone SE' } },

  // ── Gaming
  { patron: /rog\s*phone/i, ficha: { pulgadas: 6.78, proporcion: [20, 9], refresco: 165, nombre: 'ROG Phone' } },
  { patron: /red\s*magic/i, ficha: { pulgadas: 6.8, proporcion: [20, 9], refresco: 165, nombre: 'RedMagic' } },
  { patron: /black\s*shark/i, ficha: { pulgadas: 6.67, proporcion: [20, 9], refresco: 144, nombre: 'Black Shark' } },

  // ── Samsung
  { patron: /(galaxy|samsung)\s*s2[0-9]\s*(ultra|plus)/i, ficha: { pulgadas: 6.8, proporcion: [19.3, 9], refresco: 120, nombre: 'Galaxy S Ultra' } },
  { patron: /(galaxy|samsung)\s*s2[0-9]/i, ficha: { pulgadas: 6.2, proporcion: [19.5, 9], refresco: 120, nombre: 'Galaxy S' } },
  { patron: /(galaxy|samsung)\s*a5[0-9]/i, ficha: { pulgadas: 6.4, proporcion: [19.5, 9], refresco: 120, nombre: 'Galaxy A5x' } },
  { patron: /(galaxy|samsung)\s*a3[0-9]/i, ficha: { pulgadas: 6.4, proporcion: [19.5, 9], refresco: 90, nombre: 'Galaxy A3x' } },
  { patron: /(galaxy|samsung)\s*a2[0-9]/i, ficha: { pulgadas: 6.6, proporcion: [20, 9], refresco: 90, nombre: 'Galaxy A2x' } },
  { patron: /(galaxy|samsung)\s*a1[0-9]/i, ficha: { pulgadas: 6.5, proporcion: [20, 9], refresco: 60, nombre: 'Galaxy A1x' } },
  { patron: /(galaxy|samsung)\s*a0[0-9]/i, ficha: { pulgadas: 6.5, proporcion: [20, 9], refresco: 60, nombre: 'Galaxy A0x' } },

  // ── Xiaomi / Redmi / Poco
  { patron: /redmi\s*note\s*1[0-9]\s*pro/i, ficha: { pulgadas: 6.67, proporcion: [20, 9], refresco: 120, nombre: 'Redmi Note Pro' } },
  { patron: /redmi\s*note\s*1[0-9]/i, ficha: { pulgadas: 6.67, proporcion: [20, 9], refresco: 120, nombre: 'Redmi Note' } },
  { patron: /redmi\s*note\s*[89]/i, ficha: { pulgadas: 6.53, proporcion: [19.5, 9], refresco: 60, nombre: 'Redmi Note' } },
  { patron: /poco\s*f\d/i, ficha: { pulgadas: 6.67, proporcion: [20, 9], refresco: 120, nombre: 'POCO F' } },
  { patron: /poco\s*x\d/i, ficha: { pulgadas: 6.67, proporcion: [20, 9], refresco: 120, nombre: 'POCO X' } },
  { patron: /poco\s*m\d/i, ficha: { pulgadas: 6.58, proporcion: [20, 9], refresco: 90, nombre: 'POCO M' } },
  { patron: /poco\s*c\d/i, ficha: { pulgadas: 6.52, proporcion: [20, 9], refresco: 60, nombre: 'POCO C' } },
  { patron: /redmi\s*(9a|9c|10a|a[12])/i, ficha: { pulgadas: 6.53, proporcion: [20, 9], refresco: 60, nombre: 'Redmi entrada' } },

  // ── Motorola
  { patron: /moto\s*g\s*(7[0-9]|8[0-9]|9[0-9])/i, ficha: { pulgadas: 6.5, proporcion: [20, 9], refresco: 120, nombre: 'Moto G' } },
  { patron: /moto\s*g/i, ficha: { pulgadas: 6.5, proporcion: [20, 9], refresco: 90, nombre: 'Moto G' } },
  { patron: /moto\s*e/i, ficha: { pulgadas: 6.5, proporcion: [20, 9], refresco: 60, nombre: 'Moto E' } },

  // ── Otros comunes en LatAm
  { patron: /realme\s*(gt|\d{2})/i, ficha: { pulgadas: 6.6, proporcion: [20, 9], refresco: 120, nombre: 'Realme' } },
  { patron: /infinix|tecno/i, ficha: { pulgadas: 6.6, proporcion: [20, 9], refresco: 90, nombre: 'Infinix/Tecno' } },
  { patron: /honor\s*\d/i, ficha: { pulgadas: 6.7, proporcion: [20, 9], refresco: 120, nombre: 'Honor' } },
  { patron: /huawei|nova\s*\d/i, ficha: { pulgadas: 6.6, proporcion: [20, 9], refresco: 90, nombre: 'Huawei' } },
]

/** Ficha por defecto cuando el modelo no se reconoce. */
const POR_DEFECTO: FichaDispositivo = {
  pulgadas: 6.5, proporcion: [20, 9], refresco: 60, nombre: 'estimado',
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

export function cuantasFichas(): number {
  return FICHAS.length
}
