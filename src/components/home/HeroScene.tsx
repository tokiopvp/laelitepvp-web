'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Trophy, Flame, Crown, ChevronLeft, ChevronRight } from 'lucide-react'
import LiveBadge from '@/components/LiveBadge'
import type { Member } from '@/lib/types'
import { honorHoy, honorSemana } from '@/lib/armas'
import CompetenciaViva from '@/components/home/CompetenciaViva'

// El heroe es una tesis: lo primero que se ve es el marcador EN VIVO del clan,
// que es lo mas caracteristico de este proyecto. Las cuatro cifras generales
// viven en la barra de abajo y no se repiten aqui: antes estaban en los dos
// sitios y ademas los chips se montaban sobre la tarjeta en pantallas medianas.
// Los tops que van rotando en el marcador. Las KILLS primero: es la cifra que
// el jugador presume, mucho mas que el K/D.
const TOPS: {
  id: string
  titulo: string
  valor: (m: Member) => number
  formato: (v: number) => string
}[] = [
  // Las KILLS primero: es la cifra que el jugador presume, mas que el K/D.
  { id: 'kills', titulo: 'Top eliminaciones', valor: (m) => m.kills ?? 0,
    formato: (v) => v.toLocaleString('es') },
  { id: 'kd', titulo: 'Top K/D', valor: (m) => m.kd_ratio ?? 0,
    formato: (v) => v.toFixed(2) },
  { id: 'honor_hoy', titulo: 'Honor de hoy', valor: honorHoy,
    formato: (v) => `+${v.toLocaleString('es')}` },
  { id: 'hs', titulo: 'Top headshots', valor: (m) => m.headshots ?? 0,
    formato: (v) => v.toLocaleString('es') },
  { id: 'wins', titulo: 'Top victorias', valor: (m) => m.wins ?? 0,
    formato: (v) => v.toLocaleString('es') },
  { id: 'honor_semana', titulo: 'Honor de la semana', valor: honorSemana,
    formato: (v) => v.toLocaleString('es') },
  { id: 'booyahs', titulo: 'Top booyahs', valor: (m) => m.booyahs ?? 0,
    formato: (v) => v.toLocaleString('es') },
  { id: 'winrate', titulo: 'Top winrate', valor: (m) => m.winrate ?? 0,
    formato: (v) => `${v.toFixed(1)}%` },
  { id: 'maxk', titulo: 'Mas kills en una partida', valor: (m) => m.max_kills ?? 0,
    formato: (v) => v.toLocaleString('es') },
  { id: 'rev', titulo: 'Top revividas', valor: (m) => m.revividas ?? 0,
    formato: (v) => v.toLocaleString('es') },
]

export default function HeroScene({ members }: { members: Member[] }) {
  // El marcador cambia de top cada 6 s. Un panel que siempre enseña lo mismo
  // deja de mirarse; rotando, el visitante se queda a ver que sale.
  const [iTop, setITop] = useState(0)
  // `pausa` cubre dos casos: el visitante puso el dedo/raton encima para leer,
  // o esta navegando a mano con las flechas.
  const [pausa, setPausa] = useState(false)

  // Muchos equipos de juego traen las animaciones de Windows desactivadas, y
  // eso llega al navegador como prefers-reduced-motion. Antes eso paraba la
  // rotacion y el marcador se quedaba clavado en el primer top.
  //
  // El marcador SIEMPRE rota: es la decision del sitio. Lo que se respeta es
  // el MOVIMIENTO: con esa preferencia el contenido cambia sin deslizamiento
  // ni desvanecido, de golpe. Rotar contenido no es lo mismo que animarlo.
  const [sinMovimiento, setSinMovimiento] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const leer = () => setSinMovimiento(mq.matches)
    leer()
    mq.addEventListener('change', leer)
    return () => mq.removeEventListener('change', leer)
  }, [])

  useEffect(() => {
    if (pausa) return
    const id = setInterval(() => setITop((i) => (i + 1) % TOPS.length), 5000)
    return () => clearInterval(id)
  }, [pausa])

  const irA = (paso: number) => {
    setPausa(true)
    setITop((i) => (i + paso + TOPS.length) % TOPS.length)
  }

  const top = TOPS[iTop]
  const filas = useMemo(
    () =>
      members
        .map((m) => ({ nombre: m.nickname, v: top.valor(m) }))
        .filter((f) => f.v > 0)
        .sort((a, b) => b.v - a.v)
        .slice(0, 5),
    [members, top]
  )

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 60, damping: 15 })
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 60, damping: 15 })

  useEffect(() => {
    const m = (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5)
      my.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('mousemove', m)
    return () => window.removeEventListener('mousemove', m)
  }, [mx, my])

  return (
    <div style={{ perspective: 1200 }} className="relative w-full min-h-[520px] flex items-center justify-center">
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
        className="relative w-full max-w-md"
      >
        {/* Anillos rotatorios de fondo */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[125%] aspect-square rounded-full pointer-events-none"
          style={{ border: '2px solid rgba(225,29,60,0.22)', z: -70 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] aspect-square rounded-full pointer-events-none"
          style={{ border: '1px dashed rgba(232,179,60,0.35)', z: -40 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 34, repeat: Infinity, ease: 'linear' }}
        />

        {/* HUD principal (datos reales) */}
        <motion.div className="relative card-glow p-1" style={{ z: 50 }}>
          <div
            className="relative h-full bg-elite-card/95 cristal border border-elite-border rounded-2xl p-6 overflow-hidden"
            onMouseEnter={() => setPausa(true)}
            onMouseLeave={() => setPausa(false)}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-elite-primary to-elite-secondary flex items-center justify-center">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="font-display font-bold text-xl gradient-text">La Elite PvP</p>
                  <p className="text-sm text-white/50">Clan Oficial • Verificado</p>
                </div>
              </div>
              {/* Respaldado por el last_sync real, no un puntito decorativo. */}
              <LiveBadge />
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-white/40">{top.titulo}</p>
              {/* Puntitos: se ve que hay mas tops y cual toca. */}
              {/* Con diez tops, diez puntitos no caben ni se leen: una barra
                  que avanza dice lo mismo y ocupa lo mismo siempre. */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => irA(-1)}
                  aria-label="Top anterior"
                  className="w-5 h-5 rounded flex items-center justify-center text-white/35 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono tabular-nums text-white/30">
                  {iTop + 1}/{TOPS.length}
                </span>
                <button
                  onClick={() => irA(1)}
                  aria-label="Top siguiente"
                  className="w-5 h-5 rounded flex items-center justify-center text-white/35 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <div className="w-14 h-[3px] rounded-full bg-white/10 overflow-hidden" aria-hidden>
                  <motion.div
                    className="h-full rounded-full bg-elite-primary"
                    animate={{ width: `${((iTop + 1) / TOPS.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {filas.length === 0 && <p className="text-white/40 text-sm">Cargando top…</p>}
              <AnimatePresence mode="wait">
                <motion.div
                  key={top.id}
                  initial={sinMovimiento ? false : { opacity: 0, x: 26 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={sinMovimiento ? { opacity: 1 } : { opacity: 0, x: -26 }}
                  transition={{ duration: sinMovimiento ? 0 : 0.34, ease: 'easeOut' }}
                  className="space-y-2"
                >
              {filas.map((row, i) => (
                <div
                  key={row.nombre}
                  className="flex items-center justify-between bg-elite-dark/30 rounded-lg p-3 hover:bg-elite-primary/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* El oro solo para lo ganado: el primer puesto. Del 2 al 5
                        van en ceniza, para que el podio se lea de un vistazo. */}
                    <div
                      className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold tabular-nums"
                      style={
                        i === 0
                          ? { background: 'linear-gradient(135deg,#e8b33c,#ff4d68)', color: '#17130f' }
                          : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }
                      }
                    >
                      {i + 1}
                    </div>
                    <span className="font-medium truncate">{row.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm shrink-0">
                    <Flame className="w-4 h-4" style={{ color: i === 0 ? '#e8b33c' : undefined }} />
                    <span className="tabular-nums font-mono">{top.formato(row.v)}</span>
                  </div>
                </div>
              ))}
                </motion.div>
              </AnimatePresence>
            </div>

            <CompetenciaViva />

            <div className="mt-4 flex items-center justify-center gap-2 text-white/40 text-xs">
              <Trophy className="w-4 h-4 text-elite-gold" />
              Elite Coin • Gana jugando
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  )
}
