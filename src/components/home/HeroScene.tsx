'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Trophy, Flame, Crown, ChevronLeft, ChevronRight, Coins } from 'lucide-react'
import LiveBadge from '@/components/LiveBadge'
import type { Member } from '@/lib/types'
import { honorHoy, honorSemana } from '@/lib/armas'
import CompetenciaViva from '@/components/home/CompetenciaViva'
import { getLeaderboard } from '@/lib/data'

// El heroe es una tesis: lo primero que se ve es el marcador EN VIVO del clan,
// que es lo mas caracteristico de este proyecto. Las cuatro cifras generales
// viven en la barra de abajo y no se repiten aqui: antes estaban en los dos
// sitios y ademas los chips se montaban sobre la tarjeta en pantallas medianas.
// Los tops que van rotando en el marcador.
//
// ORDEN: el de Elite Coin va SIEMPRE el primero y los demas salen barajados en
// cada visita. Las coins primero porque son lo unico de esta pantalla que el
// visitante puede ganar hoy; los demas tops son merito acumulado de meses y
// ninguno merece el primer puesto fijo por encima de otro. Barajarlos ademas
// hace que la portada no se vea igual dos veces.
type Panel = {
  id: string
  titulo: string
  // De donde salen las filas. 'clan' = del censo del juego; 'coins' = del saldo
  // de la web, que vive en otra tabla y no cabe en un Member.
  fuente?: 'clan' | 'coins'
  valor: (m: Member) => number
  formato: (v: number) => string
}

const TOP_COINS: Panel = {
  id: 'coins', titulo: 'Top Elite Coin', fuente: 'coins',
  valor: () => 0, formato: (v) => v.toLocaleString('es'),
}

const TOPS: Panel[] = [
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

  // --- Los que solo se pueden enseñar desde que el censo lee el perfil entero.
  // Antes de eso estos campos venian vacios y un top de ceros no es un top.
  { id: 'hs_tasa', titulo: 'Mejor punteria (% headshot)',
    valor: (m) => m.headshot_tasa ?? 0, formato: (v) => `${v.toFixed(1)}%` },
  { id: 'top10', titulo: 'Top supervivencia (% top 10)',
    valor: (m) => m.top10_tasa ?? 0, formato: (v) => `${v.toFixed(1)}%` },
  { id: 'dano', titulo: 'Top daño por partida',
    valor: (m) => m.dano_partida ?? 0, formato: (v) => Math.round(v).toLocaleString('es') },
  { id: 'kpp', titulo: 'Top kills por partida',
    valor: (m) => m.kpp ?? 0, formato: (v) => v.toFixed(2) },
  { id: 'partidas', titulo: 'Mas partidas jugadas',
    valor: (m) => m.partidas ?? 0, formato: (v) => v.toLocaleString('es') },
  { id: 'nivel', titulo: 'Top nivel',
    valor: (m) => m.level ?? 0, formato: (v) => v.toLocaleString('es') },
  { id: 'puntos_br', titulo: 'Top puntos Battle Royale',
    valor: (m) => m.puntos_br ?? 0, formato: (v) => v.toLocaleString('es') },
  { id: 'puntos_cs', titulo: 'Top puntos Duelo de Escuadras',
    valor: (m) => m.puntos_cs ?? 0, formato: (v) => v.toLocaleString('es') },
]

// Baraja de Fisher-Yates. Se hace UNA vez por visita, no en cada render: si se
// rebarajara al rotar, el visitante veria el mismo top dos veces seguidas y se
// saltaria otros.
function barajar<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function HeroScene({ members }: { members: Member[] }) {
  // El orden de la vuelta: Elite Coin fijo el primero, el resto barajado.
  // Se calcula en el estado inicial (una sola vez) y no en el cuerpo del
  // render: si se recalculara, cada rotacion reordenaria la lista entera.
  const paneles = useState(() => [TOP_COINS, ...barajar(TOPS)])[0]

  // El top de coins no sale del censo del juego sino del saldo de la web, asi
  // que se pide aparte. Si falla, ese panel simplemente aparece vacio y los
  // demas siguen: una tabla caida no puede tumbar la portada.
  const [coins, setCoins] = useState<{ nombre: string; v: number }[]>([])
  useEffect(() => {
    let vivo = true
    getLeaderboard(5)
      .then((filas) => {
        if (!vivo) return
        setCoins(filas
          .map((f) => ({ nombre: f.display_name || 'Jugador', v: f.points ?? 0 }))
          .filter((f) => f.v > 0))
      })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

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
    const id = setInterval(() => setITop((i) => (i + 1) % paneles.length), 5000)
    return () => clearInterval(id)
  }, [pausa, paneles.length])

  const irA = (paso: number) => {
    setPausa(true)
    setITop((i) => (i + paso + paneles.length) % paneles.length)
  }

  const top = paneles[iTop]
  const filas = useMemo(
    () =>
      top.fuente === 'coins'
        ? coins
        : members
            .map((m) => ({ nombre: m.nickname, v: top.valor(m) }))
            .filter((f) => f.v > 0)
            .sort((a, b) => b.v - a.v)
            .slice(0, 5),
    [members, top, coins]
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
          style={{ border: '2px solid rgba(91,157,255,0.22)', z: -70 }}
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
        {/* La MISMA placa que la tarjeta del lider en /miembros: marco dorado
            del sistema de rangos (`member-leader` con su galon y su corriente),
            barra del juego arriba y ficha translucida para el nombre. Se
            reutilizan las clases que ya existen en globals.css en vez de
            copiar el aspecto: si un dia cambia el oro del lider, cambia aqui
            tambien. */}
        <motion.div className="relative" style={{ z: 50 }}>
          <div
            className="ff-panel member-interim relative h-full bg-elite-card/25 cristal p-5 pt-0"
            /* El marco va en el AZUL de la marca, no en oro.
               El oro es el acento de "lo ganado" -el primer puesto, las
               monedas- y en la portada, rodeando el panel entero, competia con
               los botones y con el titular: dos acentos peleando en la primera
               pantalla. Se aprovecha el mecanismo del rango interino, que ya es
               frio, y se le fijan los tonos de la marca. */
            style={{
              ['--luz' as string]: 'rgba(198, 220, 255, 0.92)',
              ['--tono' as string]: 'rgba(91, 157, 255, 0.55)',
            }}
            onMouseEnter={() => setPausa(true)}
            onMouseLeave={() => setPausa(false)}
          >
            <div className="galon-rango" />
            <div className="corriente-rango" />

            {/* Barra del juego, igual que en la tarjeta de miembro. */}
            <div className="-mx-5 mb-4 flex items-center justify-between px-4 py-2
                            bg-black/40 backdrop-blur-sm border-b border-white/[0.07]">
              <img
                src="/free-fire-logo.png"
                alt="Free Fire"
                className="h-[15px] w-auto opacity-90"
              />
              <span className="font-display text-[10px] font-bold uppercase
                               tracking-[0.17em] text-white/30">
                LA ELITE <b className="text-elite-primary">PVP</b>
              </span>
            </div>
            {/* Ficha del nombre: translucida, como la del jugador. El oro va
                en la corona porque el clan es "lo ganado"; el resto en gris. */}
            <div className="flex items-center gap-3 mb-4 p-2.5 ff-cut-sm
                            border border-white/20 bg-white/[0.07] backdrop-blur-md">
              <div className="w-11 h-11 shrink-0 ff-cut-sm flex items-center justify-center"
                   style={{ background: 'linear-gradient(145deg,#1e2a44,#5b9dff 55%,#a78bfa)' }}>
                <Crown className="w-6 h-6 text-elite-dark" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-lg leading-tight text-elite-ice">
                  La Elite PvP
                </p>
                <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-px
                                 text-[9px] font-bold uppercase tracking-[0.13em]
                                 bg-black/55 text-elite-primary">
                  Clan Oficial · Verificado
                </span>
              </div>
              {/* Respaldado por el last_sync real, no un puntito decorativo. */}
              <LiveBadge />
            </div>

            <div className="flex items-center justify-between mb-3">
              {/* Franja del apartado, con el filo del rango: es el mismo
                  recurso que marca "BATTLE ROYALE" en la tarjeta del jugador. */}
              <p className="flex items-center px-2.5 py-1 font-display text-[10px]
                            font-bold uppercase tracking-[0.13em] text-white/65"
                 style={{
                   borderLeft: '2px solid #5b9dff',
                   background: 'linear-gradient(90deg, rgba(91,157,255,0.12), transparent)',
                 }}>
                {top.titulo}
              </p>
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
                  {iTop + 1}/{paneles.length}
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
                    animate={{ width: `${((iTop + 1) / paneles.length) * 100}%` }}
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
                  className="flex items-center justify-between bg-elite-dark/15 ff-cut-sm p-2.5
                             border border-white/[0.06] hover:border-elite-primary/30
                             hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* El oro solo para lo ganado: el primer puesto. Del 2 al 5
                        van en ceniza, para que el podio se lea de un vistazo. */}
                    <div
                      className="w-8 h-8 shrink-0 ff-cut-sm flex items-center justify-center font-mono text-xs font-bold tabular-nums"
                      style={
                        i === 0
                          ? { background: 'linear-gradient(135deg,#f0b429,#a78bfa)', color: '#17130f' }
                          : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }
                      }
                    >
                      {i + 1}
                    </div>
                    <span className="font-medium truncate">{row.nombre}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm shrink-0">
                    {/* Llama para lo del juego, moneda para lo que se gasta:
                        el icono ya dice de que top se esta hablando. */}
                    {top.fuente === 'coins'
                      ? <Coins className="w-4 h-4" style={{ color: '#f0b429' }} />
                      : <Flame className="w-4 h-4" style={{ color: i === 0 ? '#f0b429' : undefined }} />}
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
