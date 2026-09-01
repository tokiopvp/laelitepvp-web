'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Medal, Coins } from 'lucide-react'
import { Member } from '@/lib/types'
import { useMembers } from '@/lib/hooks'
import {
  GRUPOS_RANKING, rankingsDeArmas, formatearRanking,
  type RankingSpec,
} from '@/lib/rankings'
import { getTop, coinsCorto, type FilaTop } from '@/lib/economia'
import { TopListSkeleton } from '@/components/Skeletons'
import Resplandor from '@/components/layout/Resplandor'
import IconoJugador from '@/components/miembros/IconoJugador'

const COLOR_PUESTO = ['#f0b429', '#c9d4de', '#cd7f32']

/**
 * Un color por MODO. La jerarquia de la pagina se lee por color: la categoria
 * grande lleva el acento de su modo, y las metricas de abajo heredan ese
 * mismo color. Asi se ve de un vistazo que las de abajo pertenecen a la de
 * arriba y no son seis botones sueltos mas.
 */
const COLOR_GRUPO: Record<string, string> = {
  clan: '#f0b429',     // oro: el clan manda
  br_temp: '#00d4ff',  // voltaje: la temporada esta viva
  br_total: '#8ab4ff', // hielo: la historia
  duelo: '#ff6b6b',    // rojo: el duelo
  coins: '#ffd700',    // oro puro: la economia
  armas: '#ff8c42',    // fuego: el arsenal
}
const colorDe = (k: string) => COLOR_GRUPO[k] ?? '#5b9dff'

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

        {/* Nivel 1: el MODO. Son las PESTAÑAS grandes, cada una con el color
            de su modo y un icono con placa propia. La activa lleva glow
            intenso y una barra que se desliza debajo: asi el ojo sabe donde
            esta parado sin leer nada. */}
        <div className="relative flex flex-wrap justify-center gap-x-2 gap-y-3 mb-2">
          {grupos.map((g) => {
            const Icon = g.icon
            const activo = grupo === g.key
            const c = colorDe(g.key)
            return (
              <button
                key={g.key}
                onClick={() => elegirGrupo(g.key)}
                className="relative flex items-center gap-2.5 px-5 pt-2.5 pb-4 font-display font-bold text-sm uppercase tracking-wider transition-all"
                style={{
                  color: activo ? c : 'rgba(255,255,255,0.45)',
                }}
                aria-pressed={activo}
              >
                <span
                  className="grid place-items-center w-7 h-7 rounded-lg border transition-all"
                  style={{
                    borderColor: activo ? c + '88' : 'rgba(255,255,255,0.1)',
                    background: activo ? c + '1f' : 'rgba(255,255,255,0.03)',
                    boxShadow: activo ? `0 0 20px ${c}44` : 'none',
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: activo ? c : 'rgba(255,255,255,0.5)' }} />
                </span>
                {g.label}
                {/* La barra que se desliza: viaja de modo en modo con la
                    identidad del color de cada uno. */}
                {activo && (
                  <motion.span
                    layoutId="top-modo-activo"
                    className="absolute inset-x-3 bottom-0 h-[3px] rounded-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)`, boxShadow: `0 0 14px ${c}` }}
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Nivel 2: la METRICA dentro del modo. Chips pequeños, redondos y del
            color del modo activo: cualquiera ve que son sub-opciones del modo
            de arriba, no otras pestañas. El caption lo dice en palabras. */}
        {grupoActual.rankings.length > 1 && grupo !== 'armas' && (
          <div className="mb-6">
            <p className="text-center text-[10px] uppercase tracking-[0.2em] text-white/25 mb-2">
              {grupoActual.label} · elige la métrica
            </p>
            <div className="relative flex flex-wrap justify-center gap-1.5 max-w-3xl mx-auto">
              {grupoActual.rankings.map((r) => {
                const activo = metrica === r.key
                const c = colorDe(grupoActual.key)
                return (
                  <button
                    key={r.key}
                    onClick={() => setMetrica(r.key)}
                    title={r.ayuda}
                    className="relative px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wide transition-colors border"
                    style={{
                      color: activo ? c : 'rgba(255,255,255,0.4)',
                      borderColor: activo ? c + '55' : 'rgba(255,255,255,0.08)',
                      background: activo ? c + '12' : 'transparent',
                    }}
                  >
                    {/* El relleno que se desliza detras del chip activo. */}
                    {activo && (
                      <motion.span
                        layoutId="top-metrica-activa"
                        className="absolute inset-0 rounded-full"
                        style={{ background: `${c}1f`, boxShadow: `0 0 12px ${c}26` }}
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    )}
                    <span className="relative">{r.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Arsenal: el mismo arma puede tener top en BR y en CS, y en una
            sola fila mezcladas se leia "MP40·BR, MP40·CS" como si fueran cosas
            distintas repetidas. Van en dos columnas, cada una con su color
            (BR cian, CS rojo) y su propio contador. */}
        {grupo === 'armas' && (
          <div className="mb-6">
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5 max-w-4xl mx-auto">
            {(['br', 'cs'] as const).map((modo) => {
              const c = modo === 'br' ? '#00d4ff' : '#ff6b6b'
              const lista = grupoActual.rankings.filter((r) => r.key.startsWith(`arma_${modo}_`))
              if (lista.length === 0) return null
              return (
                <div key={modo}>
                  <p
                    className="text-center font-display font-bold text-xs uppercase tracking-[0.18em] mb-2.5"
                    style={{ color: c, textShadow: `0 0 14px ${c}55` }}
                  >
                    {modo === 'br' ? 'Battle Royale' : 'Duelo de Escuadras'}
                    <span className="text-white/25 font-normal normal-case tracking-normal ml-2">
                      {lista.length} armas
                    </span>
                  </p>
                  <div className="relative flex flex-wrap justify-center gap-1.5">
                    {lista.map((r) => {
                      const activo = metrica === r.key
                      return (
                        <button
                          key={r.key}
                          onClick={() => setMetrica(r.key)}
                          title={r.ayuda}
                          className="relative px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors border"
                          style={{
                            color: activo ? c : 'rgba(255,255,255,0.4)',
                            borderColor: activo ? c + '55' : 'rgba(255,255,255,0.08)',
                            background: activo ? c + '12' : 'transparent',
                          }}
                        >
                          {activo && (
                            <motion.span
                              layoutId="top-metrica-activa"
                              className="absolute inset-0 rounded-full"
                              style={{ background: `${c}1f`, boxShadow: `0 0 12px ${c}26` }}
                              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            />
                          )}
                          <span className="relative">{r.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
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
