'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Medal, Coins } from 'lucide-react'
import { Member } from '@/lib/types'
import { useMembers } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import {
  GRUPOS_RANKING, rankingsDeArmas, formatearRanking,
  type RankingSpec,
} from '@/lib/rankings'
import { getTop, coinsCorto, type FilaTop } from '@/lib/economia'
import { TopListSkeleton } from '@/components/Skeletons'
import Resplandor from '@/components/layout/Resplandor'
import IconoJugador from '@/components/miembros/IconoJugador'

const COLOR_PUESTO = ['#f0b429', '#c9d4de', '#cd7f32']

/** Fila de podio o de lista, según el puesto. */
function Puesto({ i }: { i: number }) {
  if (i === 0) return <Crown className="w-5 h-5 text-elite-gold" />
  if (i === 1) return <Medal className="w-5 h-5 text-white/60" />
  if (i === 2) return <Medal className="w-5 h-5 text-amber-700" />
  return (
    <span className="font-mono text-sm text-white/30 tabular-nums w-5 text-center">
      {i + 1}
    </span>
  )
}

export default function TopsPage() {
  const { members, loading } = useMembers()
  const [grupo, setGrupo] = useState(GRUPOS_RANKING[1].key) // BR temporada
  const [metrica, setMetrica] = useState(GRUPOS_RANKING[1].rankings[0].key)
  const [coins, setCoins] = useState<FilaTop[]>([])
  const [cargandoCoins, setCargandoCoins] = useState(false)

  // Los rankings de armas se generan con lo que el bot haya leído, no a mano:
  // el arsenal de Free Fire cambia cada temporada.
  const grupos = useMemo(() => {
    const armas = rankingsDeArmas(members)
    if (armas.length === 0) return GRUPOS_RANKING
    return [
      ...GRUPOS_RANKING,
      { key: 'armas', label: 'Armas', icon: armas[0].icon, rankings: armas },
    ]
  }, [members])

  const grupoActual = grupos.find((g) => g.key === grupo) ?? grupos[0]
  const spec: RankingSpec =
    grupoActual.rankings.find((r) => r.key === metrica) ?? grupoActual.rankings[0]
  const esCoins = grupoActual.fuente === 'coins'

  // El saldo no vive en `members` sino en los perfiles de la web, así que se
  // pide aparte y solo cuando hace falta.
  useEffect(() => {
    if (!esCoins || coins.length) return
    let vivo = true
    setCargandoCoins(true)
    getTop(30)
      .then((f) => vivo && setCoins(f.filter((x) => !x.es_casa)))
      .finally(() => vivo && setCargandoCoins(false))
    return () => {
      vivo = false
    }
  }, [esCoins, coins.length])

  const clasificados = useMemo(() => {
    if (esCoins) return []
    const valor = (m: Member) => {
      const v = spec.get(m)
      if (v == null) return spec.invertido ? Infinity : -Infinity
      return v
    }
    return [...members]
      .sort((a, b) => (spec.invertido ? valor(a) - valor(b) : valor(b) - valor(a)))
      .filter((m) => spec.get(m) != null)
      .slice(0, 20)
  }, [members, spec, esCoins])

  const elegirGrupo = (k: string) => {
    const g = grupos.find((x) => x.key === k)
    if (!g) return
    setGrupo(k)
    setMetrica(g.rankings[0].key)
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Resplandor className="bottom-1/4 right-1/4 w-96 h-96" color="#3b6fd4" />
        <Resplandor className="top-1/3 left-1/5 w-80 h-80" color="#5b9dff" />
      </div>

      <div className="section-container">
        <motion.div initial={{ y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 ff-cut-sm bg-elite-gold/10 border border-elite-gold/30 mb-4">
            <Crown className="w-4 h-4 text-elite-gold" />
            <span className="text-sm font-medium tracking-widest uppercase text-elite-gold">
              Tops en vivo
            </span>
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-6xl gradient-text mb-2 uppercase">
            Rankings Elite
          </h1>
          <p className="text-white/50">
            Todo lo que el bot lee del juego, ordenado. Se actualiza cada vuelta.
          </p>
        </motion.div>

        {/* Nivel 1: el MODO. Antes había treinta botones en una sola fila y no
            se encontraba nada; la pregunta real es "¿quién manda en lo mío?",
            y lo de uno es un modo concreto. */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {grupos.map((g) => {
            const Icon = g.icon
            return (
              <button
                key={g.key}
                onClick={() => elegirGrupo(g.key)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 ff-cut-sm font-display font-semibold text-sm uppercase tracking-wide transition-all border',
                  grupo === g.key
                    ? 'bg-elite-primary/15 border-elite-primary text-elite-primary'
                    : 'bg-elite-card/60 border-elite-border text-white/50 hover:text-white hover:border-elite-primary/40',
                )}
              >
                <Icon className="w-4 h-4" />
                {g.label}
              </button>
            )
          })}
        </div>

        {/* Nivel 2: la MÉTRICA dentro de ese modo. */}
        {grupoActual.rankings.length > 1 && (
          <div className="flex flex-wrap justify-center gap-1.5 mb-3">
            {grupoActual.rankings.map((r) => (
              <button
                key={r.key}
                onClick={() => setMetrica(r.key)}
                title={r.ayuda}
                className={cn(
                  'px-3 py-1.5 ff-cut-sm text-xs font-semibold uppercase tracking-wider transition-colors border',
                  metrica === r.key
                    ? 'border-elite-primary/60 text-elite-ice bg-elite-primary/10'
                    : 'border-white/10 text-white/40 hover:text-white/80 hover:border-white/25',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {spec.ayuda && (
          <p className="text-center text-white/35 text-xs mb-8">{spec.ayuda}</p>
        )}

        {/* ------------------------------------------------ la tabla */}
        {esCoins ? (
          cargandoCoins && coins.length === 0 ? (
            <TopListSkeleton />
          ) : (
            <ol className="max-w-3xl mx-auto space-y-2">
              {coins.map((f, i) => (
                <motion.li
                  key={f.id}
                  initial={{ x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 12) * 0.03 }}
                  className="ff-panel flex items-center gap-3 px-4 py-3"
                >
                  <Puesto i={i} />
                  <IconoJugador
                    src={f.avatar_url}
                    nombre={f.nombre}
                    size={38}
                    prioritaria={i < 8}
                    aura={COLOR_PUESTO[i] ?? '#5b9dff'}
                  />
                  <span className="font-display font-semibold truncate flex-1 text-elite-ice">
                    {f.nombre}
                    {f.es_miembro && (
                      <span className="text-elite-primary text-[10px] ml-2 tracking-widest">CLAN</span>
                    )}
                  </span>
                  <span className="font-mono font-bold tabular-nums text-elite-gold flex items-center gap-1.5">
                    <Coins className="w-4 h-4" />
                    {coinsCorto(f.coins)}
                  </span>
                </motion.li>
              ))}
            </ol>
          )
        ) : loading && members.length === 0 ? (
          <TopListSkeleton />
        ) : clasificados.length === 0 ? (
          <p className="text-center text-white/30 py-12">
            Todavía no hay datos de este ranking. El bot los recoge en la próxima vuelta.
          </p>
        ) : (
          <AnimatePresence mode="wait">
            <motion.ol
              key={`${grupo}:${metrica}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto space-y-2"
            >
              {clasificados.map((m, i) => (
                <motion.li
                  key={m.id}
                  initial={{ x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 12) * 0.03 }}
                  className="ff-panel flex items-center gap-3 px-4 py-3"
                >
                  <Puesto i={i} />
                  <IconoJugador
                    src={m.avatar_url}
                    nombre={m.nickname}
                    size={38}
                    prioritaria={i < 8}
                    aura={COLOR_PUESTO[i] ?? '#5b9dff'}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold truncate text-elite-ice">
                      {m.nickname}
                    </p>
                    <p className="text-white/30 text-xs">
                      Nv {m.level}
                      {m.stats_json?.puntos_br
                        ? ` · ${Math.round(m.stats_json.puntos_br).toLocaleString('es')} pts`
                        : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-bold text-lg tabular-nums neon-celeste">
                      {formatearRanking(spec.get(m), spec)}
                    </p>
                    <p className="text-white/30 text-[10px] uppercase tracking-wider">
                      {spec.label}
                    </p>
                  </div>
                </motion.li>
              ))}
            </motion.ol>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
