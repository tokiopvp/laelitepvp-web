'use client'

import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Trophy, Flame, Crown } from 'lucide-react'
import LiveBadge from '@/components/LiveBadge'

// El heroe es una tesis: lo primero que se ve es el marcador EN VIVO del clan,
// que es lo mas caracteristico de este proyecto. Las cuatro cifras generales
// viven en la barra de abajo y no se repiten aqui: antes estaban en los dos
// sitios y ademas los chips se montaban sobre la tarjeta en pantallas medianas.
export default function HeroScene({
  leaderboard,
}: {
  leaderboard: { name: string; kd: string }[]
}) {
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
          <div className="relative h-full bg-elite-card/90 backdrop-blur-2xl border border-elite-border rounded-2xl p-6 overflow-hidden">
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

            <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Top General • K/D</p>
            <div className="space-y-2">
              {leaderboard.length === 0 && <p className="text-white/40 text-sm">Cargando top…</p>}
              {leaderboard.map((row, i) => (
                <div
                  key={row.name}
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
                    <span className="font-medium truncate">{row.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm shrink-0">
                    <Flame className="w-4 h-4" style={{ color: i === 0 ? '#e8b33c' : undefined }} />
                    <span className="tabular-nums font-mono">{row.kd}</span>
                    <span className="text-white/35 text-xs">K/D</span>
                  </div>
                </div>
              ))}
            </div>

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
