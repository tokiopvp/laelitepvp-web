import type { Member } from './types'

/**
 * Tops de ARMAS a partir de `stats_json`.
 *
 * El bot lee las cuatro combinaciones que pediste y las guarda con la forma
 *   arma_{br|cs}_{temp|total}_{nombre}_{kills|headshot|puntuacion}
 * Son ~700 claves por jugador y no se estaban usando en ninguna parte de la
 * web: estaban ahi desde el principio, escritas y sin mostrar.
 */
export type Modo = 'br' | 'cs'
export type Periodo = 'temp' | 'total'
export type MetricaArma = 'kills' | 'puntuacion' | 'headshot'

export const MODOS: { id: Modo; label: string }[] = [
  { id: 'br', label: 'Battle Royale' },
  { id: 'cs', label: 'Clash Squad' },
]
export const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'temp', label: 'Temporada' },
  { id: 'total', label: 'Trayectoria' },
]
export const METRICAS: { id: MetricaArma; label: string; sufijo: string }[] = [
  { id: 'kills', label: 'Eliminaciones', sufijo: '' },
  { id: 'puntuacion', label: 'Puntuación', sufijo: '' },
  { id: 'headshot', label: 'Tasa de cabeza', sufijo: '%' },
]

/** Nombres bonitos: el bot guarda 'mag_7', el jugador lee 'MAG-7'. */
const NOMBRES: Record<string, string> = {
  mag_7: 'MAG-7', an94: 'AN94', ak47: 'AK47', m1887: 'M1887', m1014: 'M1014',
  mp40: 'MP40', mp5: 'MP5', ump: 'UMP', xm8: 'XM8', scar: 'SCAR', aug: 'AUG',
  mac10: 'MAC10', ac80: 'AC80', parafal: 'PARAFAL', awm: 'AWM', kar98k: 'KAR98K',
  m14: 'M14', m4a1: 'M4A1', famas: 'FAMAS', groza: 'GROZA', woodpecker: 'WOODPECKER',
  vector: 'VECTOR', thompson: 'THOMPSON', p90: 'P90', desert_eagle: 'DESERT EAGLE',
}
export function nombreArma(bruto: string): string {
  return NOMBRES[bruto] ?? bruto.replace(/_/g, ' ').toUpperCase()
}

/**
 * Armas REALES de Free Fire. Todo lo que no este aqui, fuera.
 *
 * El OCR lee la rejilla de armas y a veces arrastra texto que no es un arma
 * ('aceptar', 'tactica') o parte una etiqueta de estadistica en trozos
 * ('igadordeequipo', 'ugadordeequipc' salen de "Jugador de equipo"). Sin este
 * filtro, el top de armas mostraba 'igadordeequipo' como si fuera un fusil.
 */
const ARMAS_REALES = new Set([
  // Fusiles
  'ak47', 'an94', 'aug', 'scar', 'm4a1', 'famas', 'groza', 'parafal', 'xm8',
  'woodpecker', 'ac80', 'ar_v', 'kord',
  // Tiradores
  'sks', 'svd', 'vss', 'vsk94', 'm82b', 'awm', 'kar98k', 'm14',
  // Subfusiles
  'mp40', 'mp5', 'ump', 'mac10', 'vector', 'thompson', 'p90', 'cg15', 'bizon',
  // Escopetas
  'm1887', 'm1014', 'mag_7', 'spas12',
  // Pistolas y especiales
  'usp', 'desert_eagle', 'm500', 'g18', 'mp5k',
])

/**
 * Erratas frecuentes del OCR -> el arma de verdad. 'al80' es 'ac80' leido con
 * la c cerrada, 'gruza' es 'groza', 'ar47' es 'ak47'.
 */
const ALIAS: Record<string, string> = {
  al80: 'ac80', ar47: 'ak47', gruza: 'groza', mag_1: 'mag_7',
  usp_2: 'usp', slar: 'scar', m1o14: 'm1014', mp4o: 'mp40',
}

/** Normaliza y descarta lo que no sea un arma de verdad. */
function armaValida(bruto: string): string | null {
  const limpio = ALIAS[bruto] ?? bruto
  return ARMAS_REALES.has(limpio) ? limpio : null
}

export interface FilaArma {
  arma: string
  nickname: string
  valor: number
}

/**
 * Mejor jugador por arma para una combinación dada, ordenado de mayor a menor.
 * Solo entran valores > 0: un arma que nadie usó no es un top, es una fila vacía.
 */
export function topArmas(
  members: Member[], modo: Modo, periodo: Periodo, metrica: MetricaArma, limite = 20
): FilaArma[] {
  const prefijo = `arma_${modo}_${periodo}_`
  const sufijo = `_${metrica}`
  const mejor = new Map<string, FilaArma>()

  for (const m of members) {
    const sj = m.stats_json
    if (!sj || typeof sj !== 'object') continue
    for (const [clave, valor] of Object.entries(sj)) {
      if (!clave.startsWith(prefijo) || !clave.endsWith(sufijo)) continue
      const v = Number(valor)
      if (!Number.isFinite(v) || v <= 0) continue
      const bruto = clave.slice(prefijo.length, clave.length - sufijo.length)
      const arma = armaValida(bruto)
      if (!arma) continue
      const actual = mejor.get(arma)
      if (!actual || v > actual.valor) {
        mejor.set(arma, { arma, nickname: m.nickname, valor: v })
      }
    }
  }
  return Array.from(mejor.values()).sort((a, b) => b.valor - a.valor).slice(0, limite)
}

/** Cuántas armas distintas llegó a leer el bot (para no prometer de más). */
export function armasLeidas(members: Member[]): number {
  const set = new Set<string>()
  for (const m of members) {
    const sj = m.stats_json
    if (!sj || typeof sj !== 'object') continue
    for (const k of Object.keys(sj)) {
      if (!k.startsWith('arma_')) continue
      const a = armaValida(k.split('_').slice(3, -1).join('_'))
      if (a) set.add(a)
    }
  }
  return set.size
}

/** Honor conseguido HOY, que es lo que mueve a jugar hoy. */
export function honorHoy(m: Member): number {
  const sj = m.stats_json as Record<string, number> | null
  return Number(sj?.clan_honor_hoy ?? 0) || 0
}
export function honorSemana(m: Member): number {
  const sj = m.stats_json as Record<string, number> | null
  return Number(sj?.clan_honor_semana ?? 0) || 0
}

export interface ArmaJugador {
  arma: string
  kills: number
  puntuacion: number
  headshot: number
}

/**
 * Las armas de UN jugador, ordenadas por lo que mas ha matado con ellas.
 *
 * Antes esto se enseñaba como un top global por arma, y era ilegible: mezclaba
 * a todo el clan en una rejilla donde no se entendia de quien era cada cosa.
 * El sitio natural de este dato es la ficha del jugador.
 */
export function armasDe(
  m: Member, modo: Modo, periodo: Periodo
): ArmaJugador[] {
  const sj = m.stats_json
  if (!sj || typeof sj !== 'object') return []
  const prefijo = `arma_${modo}_${periodo}_`
  const acc = new Map<string, ArmaJugador>()

  for (const [clave, valor] of Object.entries(sj)) {
    if (!clave.startsWith(prefijo)) continue
    const v = Number(valor)
    if (!Number.isFinite(v) || v <= 0) continue
    const resto = clave.slice(prefijo.length)
    const corte = resto.lastIndexOf('_')
    if (corte < 0) continue
    const bruto = resto.slice(0, corte)
    const met = resto.slice(corte + 1) as MetricaArma
    if (!['kills', 'puntuacion', 'headshot'].includes(met)) continue
    const arma = armaValida(bruto)
    if (!arma) continue
    const fila = acc.get(arma) ?? { arma, kills: 0, puntuacion: 0, headshot: 0 }
    fila[met] = v
    acc.set(arma, fila)
  }
  return Array.from(acc.values())
    .sort((a, b) => b.kills - a.kills || b.puntuacion - a.puntuacion)
}

/** Si el bot no leyo ninguna combinación, no se enseña la pestaña vacía. */
export function tieneArmas(m: Member): boolean {
  const sj = m.stats_json
  if (!sj || typeof sj !== 'object') return false
  return Object.keys(sj).some((k) => k.startsWith('arma_'))
}
