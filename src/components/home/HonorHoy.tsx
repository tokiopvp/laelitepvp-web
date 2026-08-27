'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { useMembers } from '@/lib/hooks'
import { honorHoy } from '@/lib/armas'

/**
 * Franja de honor del dia en la portada.
 *
 * Discreta a proposito: es una tira fina que se desliza bajo la portada, no
 * una tabla. El honor cambia cada pocas horas, asi que su trabajo aqui es
 * recordar que el clan esta vivo hoy, no listar a todo el mundo. El ranking
 * largo vive en /tops.
 */
export default function HonorHoy() {
  const { members } = useMembers()

  const filas = useMemo(
    () =>
      members
        .map((m) => ({ nick: m.nickname, hoy: honorHoy(m) }))
        .filter((f) => f.hoy > 0)
        .sort((a, b) => b.hoy - a.hoy)
        .slice(0, 6),
    [members]
  )

  // Sin honor hoy no se ocupa sitio: una franja vacia resta.
  if (filas.length === 0) return null
  const maximo = filas[0].hoy

  return (
    <section className="section-container py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="card px-5 py-4"
      >
        <div className="flex items-center gap-2.5 mb-3.5">
          <motion.span
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <Flame className="w-4 h-4 text-elite-primary" />
          </motion.span>
          <p className="text-xs uppercase tracking-[0.18em] text-white/45">
            Honor de hoy
          </p>
          <span className="ml-auto text-[11px] text-white/30 tabular-nums">
            {filas.length} {filas.length === 1 ? 'activo' : 'activos'}
          </span>
        </div>

        {/* Tira horizontal: cada uno una pastilla con su barra de fondo. */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
          {filas.map((f, i) => (
            <motion.div
              key={f.nick}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 + i * 0.07, duration: 0.45 }}
              className="relative shrink-0 rounded-xl border border-white/[0.08] overflow-hidden px-3.5 py-2.5 min-w-[124px]"
            >
              <motion.div
                className="absolute inset-y-0 left-0 pointer-events-none"
                initial={{ width: 0 }}
                whileInView={{ width: `${(f.hoy / maximo) * 100}%` }}
                viewport={{ once: true }}
                transition={{ delay: 0.25 + i * 0.07, duration: 0.9, ease: 'easeOut' }}
                style={{
                  background:
                    'linear-gradient(90deg, rgba(225,29,60,0.22), rgba(225,29,60,0.03))',
                }}
              />
              <p className="relative text-[11px] text-white/55 truncate max-w-[104px]">
                {f.nick}
              </p>
              <p
                className="relative font-mono tabular-nums text-sm font-semibold"
                style={{ color: i === 0 ? '#e8b33c' : '#e11d3c' }}
              >
                +{f.hoy.toLocaleString('es')}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
