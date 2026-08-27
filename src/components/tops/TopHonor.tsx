'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import type { Member } from '@/lib/types'
import { honorHoy, honorSemana } from '@/lib/armas'

/**
 * Honor conseguido HOY.
 *
 * El juego solo enseña el acumulado de la semana; "lo de hoy" lo calcula el
 * sync restando la lectura mas baja del dia a la ultima. Es el numero que de
 * verdad empuja a jugar: la semana premia al que ya iba lejos, el dia se
 * reinicia para todos.
 */
export default function TopHonor({ members }: { members: Member[] }) {
  const filas = useMemo(
    () =>
      members
        .map((m) => ({ nick: m.nickname, hoy: honorHoy(m), semana: honorSemana(m) }))
        .filter((f) => f.hoy > 0 || f.semana > 0)
        .sort((a, b) => b.hoy - a.hoy || b.semana - a.semana)
        .slice(0, 12),
    [members]
  )
  const activosHoy = filas.filter((f) => f.hoy > 0).length
  const maximo = filas[0]?.hoy || 1

  return (
    <section className="mt-16">
      <div className="flex items-center gap-2 mb-1">
        <Flame className="w-5 h-5 text-elite-primary" />
        <h2 className="section-title !mb-0 !text-2xl sm:!text-3xl">Honor de hoy</h2>
      </div>
      <p className="text-white/50 mb-6">
        {activosHoy > 0
          ? `${activosHoy} ${activosHoy === 1 ? 'jugador ha sumado' : 'jugadores han sumado'} honor hoy.`
          : 'Nadie ha sumado honor todavía hoy. La cancha está abierta.'}
      </p>

      {filas.length === 0 ? (
        <div className="card p-8 text-center text-white/45">
          Aún no hay lecturas de honor.
        </div>
      ) : (
        <div className="card overflow-hidden">
          {filas.map((f, i) => (
            <motion.div
              key={f.nick}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              className="relative flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] last:border-0"
            >
              {f.hoy > 0 && (
                <div
                  className="absolute inset-y-0 left-0 pointer-events-none"
                  style={{
                    width: `${Math.max(3, (f.hoy / maximo) * 100)}%`,
                    background:
                      'linear-gradient(90deg, rgba(225,29,60,0.18), rgba(225,29,60,0.02))',
                  }}
                />
              )}
              <span
                className="relative w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold tabular-nums"
                style={
                  i === 0 && f.hoy > 0
                    ? { background: 'linear-gradient(135deg,#e8b33c,#ff4d68)', color: '#101014' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }
                }
              >
                {i + 1}
              </span>
              <span className="relative flex-1 min-w-0 text-sm font-semibold truncate">
                {f.nick}
              </span>
              <span className="relative text-[11px] text-white/35 shrink-0 hidden sm:inline">
                semana {f.semana.toLocaleString('es')}
              </span>
              <span
                className="relative font-mono tabular-nums text-sm shrink-0 w-16 text-right"
                style={{ color: f.hoy > 0 ? '#e11d3c' : 'rgba(255,255,255,0.28)' }}
              >
                {f.hoy > 0 ? `+${f.hoy.toLocaleString('es')}` : '—'}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}
