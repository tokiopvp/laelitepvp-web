import {
  Zap,
  Target,
  Trophy,
  Flame,
  Skull,
  Percent,
  Crosshair,
  Swords,
  HeartPulse,
  Crown,
  Star,
} from 'lucide-react'
import type { Member } from './types'

export interface StatSpec {
  key: string
  label: string
  icon: any
  decimals: number
  suffix?: string
  /** Lee el valor desde stats_json (o columnas) de forma null-safe */
  get: (m: Member) => number | null
}

const best = (m: Member, ...keys: string[]): number | null => {
  const s = m.stats_json || {}
  let out: number | null = null
  for (const k of keys) {
    const v = s[k]
    if (typeof v === 'number' && !isNaN(v)) {
      if (out === null || v > out) out = v
    }
  }
  return out
}

const col = (m: Member, k: keyof Member): number | null => {
  const v = m[k] as number | null | undefined
  return typeof v === 'number' && !isNaN(v) ? v : null
}

export const STAT_CATEGORIES: StatSpec[] = [
  { key: 'kd', label: 'K/D Ratio', icon: Zap, decimals: 2, get: (m) => best(m, 'br_temp_solo_kd', 'br_temp_duo_kd', 'br_temp_escuadra_kd') },
  { key: 'headshots', label: 'Headshots', icon: Target, decimals: 0, get: (m) => col(m, 'headshots') ?? best(m, 'de_temp_headshots', 'de_total_headshots') },
  { key: 'wins', label: 'Victorias', icon: Trophy, decimals: 0, get: (m) => col(m, 'wins') ?? best(m, 'br_temp_solo_wins', 'br_temp_duo_wins', 'br_temp_escuadra_wins') },
  { key: 'booyahs', label: 'Booyahs', icon: Flame, decimals: 0, get: (m) => col(m, 'booyahs') ?? best(m, 'de_temp_wins') },
  { key: 'kills', label: 'Kills', icon: Skull, decimals: 0, get: (m) => best(m, 'de_total_kills', 'br_temp_solo_kills', 'br_temp_duo_kills', 'br_temp_escuadra_kills') },
  { key: 'winrate', label: 'Winrate', icon: Percent, decimals: 2, suffix: '%', get: (m) => best(m, 'br_temp_solo_winrate', 'br_temp_duo_winrate', 'br_temp_escuadra_winrate') },
  { key: 'kpp', label: 'Kills/Partida', icon: Crosshair, decimals: 2, get: (m) => best(m, 'br_temp_solo_kpp', 'br_temp_duo_kpp', 'br_temp_escuadra_kpp') },
  { key: 'partidas', label: 'Partidas', icon: Swords, decimals: 0, get: (m) => best(m, 'br_total_solo_partidas', 'br_total_duo_partidas', 'br_total_escuadra_partidas') },
  { key: 'dano', label: 'Daño/Partida', icon: HeartPulse, decimals: 0, get: (m) => best(m, 'br_temp_solo_dano_partida', 'br_temp_duo_dano_partida', 'br_temp_escuadra_dano_partida') },
  { key: 'hs_tasa', label: 'Headshot %', icon: Crosshair, decimals: 2, suffix: '%', get: (m) => best(m, 'de_temp_headshot_tasa', 'br_temp_solo_headshot_tasa', 'br_temp_duo_headshot_tasa', 'br_temp_escuadra_headshot_tasa') },
  { key: 'top10', label: 'Top 10 %', icon: Crown, decimals: 2, suffix: '%', get: (m) => best(m, 'br_temp_solo_top10_tasa', 'br_temp_duo_top10_tasa', 'br_temp_escuadra_top10_tasa') },
  { key: 'max_kills', label: 'Max Kills', icon: Star, decimals: 0, get: (m) => best(m, 'br_temp_solo_max_kills', 'br_temp_duo_max_kills', 'br_temp_escuadra_max_kills') },
  { key: 'revividas', label: 'Revividas', icon: HeartPulse, decimals: 0, get: (m) => best(m, 'br_temp_solo_revividas', 'br_temp_duo_revividas', 'br_temp_escuadra_revividas') },
]

export function statValue(m: Member, spec: StatSpec): number | null {
  return spec.get(m)
}

export function formatStat(value: number | null, spec: StatSpec): string {
  if (value == null || isNaN(value)) return '—'
  const n = spec.decimals > 0 ? value.toFixed(spec.decimals) : Math.round(value).toLocaleString('en-US')
  return `${n}${spec.suffix ?? ''}`
}
