import {
  Zap, Target, Trophy, Flame, Skull, Percent, Crosshair, Swords,
  HeartPulse, Crown, Star, Timer, Coins, Gauge, ShieldCheck, Handshake,
  Activity, Radar, Sparkles,
} from 'lucide-react'
import type { Member } from './types'

/**
 * CATALOGO DE RANKINGS.
 *
 * Antes había trece tops, todos de Battle Royale de la temporada actual, porque
 * era lo único que el barrido conseguía leer. Ahora el escáner trae 241
 * métricas por jugador —BR temporada e histórico con sus tres modos, Duelo de
 * Escuadras en sus dos modos, y las armas en cuatro combinaciones—, así que la
 * limitación ya no es el dato.
 *
 * Se comprobó contra la base cuáles tienen cobertura real antes de ponerlas
 * aquí: todas las de esta lista las tienen 38 o más de los 44 miembros. Un
 * ranking donde la mitad sale con "—" no es un ranking, es una lista de huecos.
 *
 * ORGANIZACION. Van agrupadas por MODO, no en una fila de treinta botones. La
 * pregunta que trae a alguien aquí es "¿quién manda en lo mío?", y lo suyo es
 * un modo concreto: el que juega Duelo no compara su K/D de escuadra.
 */

export interface RankingSpec {
  key: string
  label: string
  icon: any
  decimals: number
  suffix?: string
  /** Frase corta que explica qué mide, para quien no conoce la métrica. */
  ayuda?: string
  /** Menos es mejor (p. ej. tiempo sin conectarse). */
  invertido?: boolean
  get: (m: Member) => number | null
}

export interface GrupoRanking {
  key: string
  label: string
  icon: any
  /** Los rankings de coins no salen de `members`, sino de los perfiles. */
  fuente?: 'miembros' | 'coins'
  rankings: RankingSpec[]
}

// ---------------------------------------------------------------- lectores
/** El MAYOR de varias claves (p. ej. el mejor K/D entre solo, duo y escuadra). */
const mejor = (m: Member, ...claves: string[]): number | null => {
  const s = m.stats_json || {}
  let out: number | null = null
  for (const k of claves) {
    const v = s[k]
    if (typeof v === 'number' && !isNaN(v) && (out === null || v > out)) out = v
  }
  return out
}

/** La SUMA de varias claves (p. ej. kills totales entre los tres modos). */
const suma = (m: Member, ...claves: string[]): number | null => {
  const s = m.stats_json || {}
  let out: number | null = null
  for (const k of claves) {
    const v = s[k]
    if (typeof v === 'number' && !isNaN(v)) out = (out ?? 0) + v
  }
  return out
}

/** Una clave concreta. */
const uno = (m: Member, clave: string): number | null => {
  const v = (m.stats_json || {})[clave]
  return typeof v === 'number' && !isNaN(v) ? v : null
}

const columna = (m: Member, k: keyof Member): number | null => {
  const v = m[k] as number | null | undefined
  return typeof v === 'number' && !isNaN(v) ? v : null
}

const MODOS = ['solo', 'duo', 'escuadra'] as const
const porModo = (prefijo: string, campo: string) =>
  MODOS.map((x) => `${prefijo}_${x}_${campo}`)

// ------------------------------------------------------------------ grupos
export const GRUPOS_RANKING: GrupoRanking[] = [
  {
    key: 'clan',
    label: 'Clan',
    icon: Crown,
    rankings: [
      {
        key: 'honor', label: 'Honor semanal', icon: Sparkles, decimals: 0,
        ayuda: 'Lo que ha aportado al clan esta semana, según el propio juego.',
        get: (m) => uno(m, 'clan_honor_semana'),
      },
      {
        key: 'puntos_br', label: 'Puntos BR', icon: Trophy, decimals: 0,
        ayuda: 'Puntos de la temporada de Battle Royale. Es lo que marca el rango de verdad.',
        get: (m) => uno(m, 'puntos_br'),
      },
      {
        key: 'puntos_cs', label: 'Puntos Duelo', icon: Swords, decimals: 0,
        ayuda: 'Estrellas de la temporada de Duelo de Escuadras.',
        get: (m) => uno(m, 'puntos_cs'),
      },
      {
        key: 'nivel', label: 'Nivel', icon: Star, decimals: 0,
        ayuda: 'Nivel de la cuenta.',
        get: (m) => columna(m, 'level') ?? uno(m, 'nivel'),
      },
      {
        key: 'likes', label: 'Likes', icon: Flame, decimals: 0,
        ayuda: 'Los "me gusta" que le han dado en su perfil.',
        get: (m) => uno(m, 'likes'),
      },
      {
        key: 'conectado', label: 'Más conectado', icon: Activity, decimals: 1, suffix: ' h',
        ayuda: 'Horas desde su última conexión. Cuanto menos, más arriba.',
        invertido: true,
        get: (m) => uno(m, 'horas_sin_conectar'),
      },
    ],
  },

  {
    key: 'br_temp',
    label: 'Battle Royale · temporada',
    icon: Zap,
    rankings: [
      { key: 'kd', label: 'K/D', icon: Zap, decimals: 2,
        ayuda: 'Su mejor K/D entre solo, dúo y escuadra.',
        get: (m) => mejor(m, ...porModo('br_temp', 'kd')) },
      { key: 'kills', label: 'Eliminaciones', icon: Skull, decimals: 0,
        ayuda: 'Sumando los tres modos.',
        get: (m) => suma(m, ...porModo('br_temp', 'kills')) },
      { key: 'wins', label: 'Booyahs', icon: Trophy, decimals: 0,
        ayuda: 'Partidas ganadas esta temporada, los tres modos.',
        get: (m) => suma(m, ...porModo('br_temp', 'wins')) },
      { key: 'winrate', label: 'Winrate', icon: Percent, decimals: 2, suffix: '%',
        ayuda: 'Su mejor porcentaje de victorias.',
        get: (m) => mejor(m, ...porModo('br_temp', 'winrate')) },
      { key: 'kpp', label: 'Kills/partida', icon: Crosshair, decimals: 2,
        ayuda: 'Cuántas elimina de media cada partida.',
        get: (m) => mejor(m, ...porModo('br_temp', 'kpp')) },
      { key: 'partidas', label: 'Partidas', icon: Swords, decimals: 0,
        ayuda: 'Quién más juega. Los tres modos sumados.',
        get: (m) => suma(m, ...porModo('br_temp', 'partidas')) },
      { key: 'hs_tasa', label: 'Headshot %', icon: Target, decimals: 2, suffix: '%',
        ayuda: 'Porcentaje de disparos a la cabeza que da el juego.',
        get: (m) => mejor(m, ...porModo('br_temp', 'headshot_tasa')) },
      { key: 'dano', label: 'Daño/partida', icon: Gauge, decimals: 0,
        ayuda: 'Daño medio que reparte por partida.',
        get: (m) => mejor(m, ...porModo('br_temp', 'dano_partida')) },
      { key: 'max_kills', label: 'Récord de kills', icon: Flame, decimals: 0,
        ayuda: 'Su mejor partida: cuántas eliminó.',
        get: (m) => mejor(m, ...porModo('br_temp', 'max_kills')) },
      { key: 'top10', label: 'Top 10 %', icon: Radar, decimals: 2, suffix: '%',
        ayuda: 'Con qué frecuencia llega al top 10.',
        get: (m) => mejor(m, ...porModo('br_temp', 'top10_tasa')) },
      { key: 'supervivencia', label: 'Supervivencia', icon: Timer, decimals: 0, suffix: ' s',
        ayuda: 'Cuánto aguanta vivo de media.',
        get: (m) => mejor(m, ...porModo('br_temp', 'supervivencia')) },
      { key: 'revividas', label: 'Revividas', icon: HeartPulse, decimals: 0,
        ayuda: 'A cuántos compañeros ha levantado.',
        get: (m) => suma(m, ...porModo('br_temp', 'revividas')) },
    ],
  },

  {
    key: 'br_total',
    label: 'Battle Royale · histórico',
    icon: Crown,
    rankings: [
      { key: 'kd', label: 'K/D de siempre', icon: Zap, decimals: 2,
        ayuda: 'Su mejor K/D contando toda su trayectoria.',
        get: (m) => mejor(m, ...porModo('br_total', 'kd')) },
      { key: 'kills', label: 'Kills de siempre', icon: Skull, decimals: 0,
        ayuda: 'Todo lo que lleva eliminado desde que juega.',
        get: (m) => suma(m, ...porModo('br_total', 'kills')) },
      { key: 'wins', label: 'Booyahs de siempre', icon: Trophy, decimals: 0,
        get: (m) => suma(m, ...porModo('br_total', 'wins')) },
      { key: 'partidas', label: 'Partidas jugadas', icon: Swords, decimals: 0,
        ayuda: 'Los veteranos de verdad.',
        get: (m) => suma(m, ...porModo('br_total', 'partidas')) },
      { key: 'winrate', label: 'Winrate histórico', icon: Percent, decimals: 2, suffix: '%',
        get: (m) => mejor(m, ...porModo('br_total', 'winrate')) },
      { key: 'kpp', label: 'Kills/partida', icon: Crosshair, decimals: 2,
        get: (m) => mejor(m, ...porModo('br_total', 'kpp')) },
      { key: 'hs_tasa', label: 'Headshot %', icon: Target, decimals: 2, suffix: '%',
        get: (m) => mejor(m, ...porModo('br_total', 'headshot_tasa')) },
      { key: 'max_kills', label: 'Récord de kills', icon: Flame, decimals: 0,
        get: (m) => mejor(m, ...porModo('br_total', 'max_kills')) },
    ],
  },

  {
    key: 'duelo',
    label: 'Duelo de Escuadras',
    icon: Swords,
    rankings: [
      { key: 'kda', label: 'KDA', icon: Zap, decimals: 2,
        ayuda: 'El K/D del 4v4, tal como lo calcula el juego.',
        get: (m) => uno(m, 'de_temp_kda') },
      { key: 'kills', label: 'Eliminaciones', icon: Skull, decimals: 0,
        get: (m) => uno(m, 'de_temp_kills') },
      { key: 'wins', label: 'Rondas ganadas', icon: Trophy, decimals: 0,
        get: (m) => uno(m, 'de_temp_wins') },
      { key: 'victorias_pct', label: '% de victorias', icon: Percent, decimals: 2, suffix: '%',
        get: (m) => uno(m, 'de_temp_victorias_pct') },
      { key: 'hs_tasa', label: 'Headshot %', icon: Target, decimals: 2, suffix: '%',
        get: (m) => uno(m, 'de_temp_headshot_tasa') },
      { key: 'headshots', label: 'Tiros a la cabeza', icon: Crosshair, decimals: 0,
        get: (m) => uno(m, 'de_temp_headshots') },
      { key: 'dano', label: 'Daño/partida', icon: Gauge, decimals: 0,
        get: (m) => uno(m, 'de_temp_dano_partida') },
      { key: 'resucitar', label: 'Compañeros levantados', icon: Handshake, decimals: 0,
        ayuda: 'El que juega para el equipo.',
        get: (m) => uno(m, 'de_temp_resucitar') },
      { key: 'dejados', label: 'Bajas dejadas', icon: ShieldCheck, decimals: 0,
        get: (m) => uno(m, 'de_temp_dejados') },
      { key: 'kda_total', label: 'KDA de siempre', icon: Crown, decimals: 2,
        get: (m) => uno(m, 'de_total_kda') },
      { key: 'kills_total', label: 'Kills de siempre', icon: Flame, decimals: 0,
        get: (m) => uno(m, 'de_total_kills') },
      { key: 'partidas_total', label: 'Partidas de siempre', icon: Swords, decimals: 0,
        get: (m) => uno(m, 'de_total_partidas') },
    ],
  },

  {
    key: 'coins',
    label: 'Elite Coin',
    icon: Coins,
    fuente: 'coins',
    rankings: [
      { key: 'coins', label: 'Saldo', icon: Coins, decimals: 0,
        ayuda: 'Quién manda en la economía del clan.',
        get: () => null },
    ],
  },
]

/**
 * Rankings de ARMAS, generados a partir de lo que el bot haya leído.
 *
 * No se listan a mano porque el arsenal cambia con cada temporada de Free Fire:
 * se miran las claves que trae la gente y se arma la lista con las armas que
 * de verdad usa el clan. Así una escopeta nueva aparece sola en cuanto alguien
 * la juega.
 */
export function rankingsDeArmas(miembros: Member[], minimo = 8): RankingSpec[] {
  // Un objeto plano y no un Map: el tsconfig del proyecto apunta por debajo de
  // ES2015 y ahi no se puede recorrer un Map sin `downlevelIteration`.
  const cuenta: Record<string, number> = {}
  for (const m of miembros) {
    for (const k of Object.keys(m.stats_json || {})) {
      // arma_{br|cs}_{temp|total}_{nombre}_{campo}
      const p = k.match(/^arma_(br|cs)_(temp|total)_(.+)_(puntuacion|kills|headshot)$/)
      if (!p) continue
      // Solo la temporada actual y la puntuación: es lo comparable y lo que se
      // entiende de un vistazo. Con las cuatro combinaciones salían 195 tops.
      if (p[2] !== 'temp' || p[4] !== 'puntuacion') continue
      cuenta[k] = (cuenta[k] ?? 0) + 1
    }
  }

  return Object.keys(cuenta)
    .map((k) => [k, cuenta[k]] as [string, number])
    .filter(([, n]) => n >= minimo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .map(([clave]) => {
      const p = clave.match(/^arma_(br|cs)_temp_(.+)_puntuacion$/)!
      const nombre = p[2].replace(/_/g, ' ').toUpperCase()
      return {
        key: clave,
        label: `${nombre} · ${p[1].toUpperCase()}`,
        icon: Crosshair,
        decimals: 0,
        ayuda: `Puntuación más alta con ${nombre} en ${p[1] === 'br' ? 'Battle Royale' : 'Duelo de Escuadras'}.`,
        get: (m: Member) => uno(m, clave),
      } as RankingSpec
    })
}

export function formatearRanking(valor: number | null, spec: RankingSpec): string {
  if (valor == null || isNaN(valor)) return '—'
  // La supervivencia se guarda en segundos; en minutos se lee de un vistazo.
  if (spec.suffix === ' s') {
    const m = Math.floor(valor / 60)
    const s = Math.round(valor % 60)
    return `${m}'${String(s).padStart(2, '0')}"`
  }
  const n = spec.decimals > 0
    ? valor.toFixed(spec.decimals)
    : Math.round(valor).toLocaleString('es')
  return `${n}${spec.suffix ?? ''}`
}
