'use client'

import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Trophy, Users, Flame, Crown } from 'lucide-react'

const CHIP_POS = ['-top-8 -left-8', '-top-8 -right-8', '-bottom-8 -left-8', '-bottom-8 -right-8']
const CHIP_ICON = [Users, Trophy, Crown, Flame]

export default function HeroScene({
  stats,
  leaderboard,
}: {
  stats: { value: string; label: string; icon: any; color: string }[]
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
          style={{ border: '2px solid rgba(0,212,255,0.22)', z: -70 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] aspect-square rounded-full pointer-events-none"
          style={{ border: '1px dashed rgba(124,58,237,0.35)', z: -40 }}
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
              <div className="flex items-center gap-2 bg-elite-primary/10 px-3 py-1 rounded-full">
                <motion.div className="w-2 h-2 bg-elite-primary rounded-full animate-pulse" />
                <span className="text-xs font-medium text-elite-primary">LIVE</span>
              </div>
            </div>

            <p className="text-xs uppercase tracking-widest text-white/40 mb-3">Top General • K/D</p>
            <div className="space-y-2">
              {leaderboard.length === 0 && <p className="text-white/40 text-sm">Cargando top…</p>}
              {leaderboard.map((row, i) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between bg-elite-dark/30 rounded-lg p-3 hover:bg-elite-primary/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-elite-primary to-elite-secondary flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <span className="font-medium">{row.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Flame className="w-4 h-4" />
                    <span>{row.kd} K/D</span>
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

        {/* Chips de stats orbitando en 3D */}
        {stats.map((s, i) => {
          const Icon = CHIP_ICON[i % 4]
          return (
            <motion.div
              key={s.label}
              className={`absolute ${CHIP_POS[i % 4]} card-glow px-3 py-2 z-30`}
              style={{ z: 90 }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5" style={{ color: s.color }} />
                <div>
                  <p className="font-display font-bold text-sm gradient-text">{s.value}</p>
                  <p className="text-[10px] text-white/50 leading-none">{s.label}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
