'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swords, Trophy } from 'lucide-react'
import { getDuelos, coinsCorto } from '@/lib/economia'
import { subscribeToTable } from '@/lib/data'
import { DISCORD } from '@/lib/contacto'
import type { Duelo } from '@/lib/economia'

/**
 * Duelos PvP en vivo.
 *
 * POR QUÉ ESTÁ EN LA WEB Y NO SOLO EN DISCORD
 * -------------------------------------------
 * Las apuestas ocurren en el Discord, pero quien todavía no está dentro no
 * puede verlas — y ese es justo a quien hay que convencer. Ver a dos personas
 * jugándose 5.000 coins ahora mismo hace más por que alguien entre al servidor
 * que cualquier texto explicándolo.
 *
 * Se actualiza en vivo: cuando un moderador da el veredicto en Discord, el
 * resultado aparece aquí sin recargar, a la vez que el gráfico registra el
 * movimiento y el ranking cambia.
 */

const ESTADO = {
  abierta: { txt: 'Buscando rival', color: 'text-elite-gold', borde: 'border-elite-gold/30' },
  jugando: { txt: 'En combate', color: 'text-elite-primary', borde: 'border-elite-primary/40' },
  resuelta: { txt: 'Terminado', color: 'text-white/40', borde: 'border-white/10' },
  cancelada: { txt: 'Cancelado', color: 'text-white/25', borde: 'border-white/10' },
} as const

export default function Duelos() {
  const [duelos, setDuelos] = useState<Duelo[]>([])
  const [cargado, setCargado] = useState(false)

  const cargar = useCallback(async () => {
    setDuelos(await getDuelos(8))
    setCargado(true)
  }, [])

  useEffect(() => {
    cargar()
    // Un veredicto dado en Discord tiene que verse aquí al instante: ese
    // "acaba de pasar" es lo que hace que la página se sienta viva.
    const off = subscribeToTable('bets', cargar)
    return off
  }, [cargar])

  // Sin duelos NO se esconde: ahora comparte fila con el ranking y dejarlo
  // vacío abriría un hueco. Se convierte en invitación, que además anuncia una
  // función que mucha gente no sabe que existe. Lo que no se hace es fingir
  // actividad: se dice claramente que no hay ninguno abierto.
  const vacio = cargado && duelos.length === 0

  return (
    <section className="card-glow overflow-hidden">
      <header className="flex items-center justify-between gap-4 p-4 sm:p-5 border-b border-white/[0.06]">
        <div>
          <h2 className="font-display font-bold text-xl inline-flex items-center gap-2">
            <Swords className="w-5 h-5 text-elite-primary" /> Duelos PvP
          </h2>
          <p className="text-white/40 text-xs mt-0.5">
            Retos por Elite Coin. El ganador se lo lleva todo.
          </p>
        </div>
        <a
          href={DISCORD}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-elite-primary/40 text-elite-primary px-3 py-2 text-xs font-display font-bold hover:bg-elite-primary/10 transition-colors"
        >
          Retar en Discord
        </a>
      </header>

      {vacio ? (
        <div className="p-6 text-center">
          <Swords className="w-8 h-8 text-white/15 mx-auto mb-3" />
          <p className="text-white/50 text-sm mb-1">Ningún duelo abierto ahora mismo.</p>
          <p className="text-white/30 text-xs leading-snug">
            Reta a quien quieras en el Discord: los dos ponéis las mismas coins y el que gana
            se lo lleva todo.
          </p>
        </div>
      ) : (
      <ul className="divide-y divide-white/[0.04] max-h-[380px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {duelos.map((d) => {
            const e = ESTADO[d.estado] ?? ESTADO.cancelada
            const ganoCreador = d.ganador_id && d.ganador_id === d.creador_id
            const ganoRival = d.ganador_id && d.ganador_id === d.rival_id
            return (
              <motion.li
                key={d.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 px-4 sm:px-5 py-3"
              >
                <span
                  className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded border ${e.borde} ${e.color}`}
                >
                  {e.txt}
                </span>

                <div className="min-w-0 flex-1 text-sm">
                  <span
                    className={`font-display font-semibold ${
                      // El ganador se marca en oro y el perdedor se apaga: el
                      // resultado tiene que leerse sin buscarlo.
                      ganoCreador ? 'text-elite-gold' : d.ganador_id ? 'text-white/35' : ''
                    }`}
                  >
                    {d.creador_nombre}
                    {ganoCreador && <Trophy className="inline w-3 h-3 ml-1 -mt-0.5" />}
                  </span>

                  <span className="text-white/25 mx-2 text-xs">vs</span>

                  <span
                    className={`font-display font-semibold ${
                      ganoRival ? 'text-elite-gold' : d.ganador_id ? 'text-white/35' : ''
                    }`}
                  >
                    {d.rival_nombre || <span className="text-white/25 italic">esperando…</span>}
                    {ganoRival && <Trophy className="inline w-3 h-3 ml-1 -mt-0.5" />}
                  </span>
                </div>

                <span className="shrink-0 font-mono font-bold text-sm text-elite-gold tabular-nums">
                  {coinsCorto(d.estado === 'abierta' ? d.monto : d.monto * 2)}
                </span>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      )}
    </section>
  )
}
