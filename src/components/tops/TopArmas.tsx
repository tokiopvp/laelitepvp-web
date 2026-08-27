'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Crosshair } from 'lucide-react'
import type { Member } from '@/lib/types'
import {
  MODOS, PERIODOS, METRICAS, topArmas, nombreArma, armasLeidas,
  type Modo, type Periodo, type MetricaArma,
} from '@/lib/armas'

/**
 * Tops por ARMA en las cuatro combinaciones que lee el bot.
 *
 * Son unas 700 metricas por jugador que llevaban desde el principio guardadas
 * en `stats_json` sin que nada las mostrara.
 */
export default function TopArmas({ members }: { members: Member[] }) {
  const [modo, setModo] = useState<Modo>('br')
  const [periodo, setPeriodo] = useState<Periodo>('temp')
  const [metrica, setMetrica] = useState<MetricaArma>('kills')

  const filas = useMemo(
    () => topArmas(members, modo, periodo, metrica),
    [members, modo, periodo, metrica]
  )
  const totalArmas = useMemo(() => armasLeidas(members), [members])
  const meta = METRICAS.find((m) => m.id === metrica)!
  const maximo = filas[0]?.valor || 1

  const Grupo = <T extends string>({
    opciones, valor, set,
  }: { opciones: { id: T; label: string }[]; valor: T; set: (v: T) => void }) => (
    <div className="inline-flex rounded-lg border border-white/10 p-0.5 bg-white/[0.03]">
      {opciones.map((o) => (
        <button
          key={o.id}
          onClick={() => set(o.id)}
          aria-pressed={valor === o.id}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            valor === o.id
              ? 'bg-elite-primary text-white'
              : 'text-white/55 hover:text-white/85'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )

  return (
    <section className="mt-16">
      <div className="flex items-center gap-2 mb-1">
        <Crosshair className="w-5 h-5 text-elite-primary" />
        <h2 className="section-title !mb-0 !text-2xl sm:!text-3xl">Dominio de armas</h2>
      </div>
      <p className="text-white/50 mb-6">
        Quién manda con cada arma. {totalArmas} armas leídas del juego.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        <Grupo opciones={MODOS} valor={modo} set={setModo} />
        <Grupo opciones={PERIODOS} valor={periodo} set={setPeriodo} />
        <Grupo opciones={METRICAS} valor={metrica} set={setMetrica} />
      </div>

      {filas.length === 0 ? (
        <div className="card p-8 text-center text-white/45">
          Todavía no hay lecturas de armas para esta combinación.
        </div>
      ) : (
        /* MODO VENTANA: una tarjeta por arma. La lista en filas obligaba a
           leer de izquierda a derecha para comparar; en rejilla el arma y su
           dueño se ven de golpe, y el podio se distingue por el marco. */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filas.map((f, i) => {
            const podio = i < 3
            const acento = i === 0 ? '#e8b33c' : i < 3 ? '#e11d3c' : 'rgba(255,255,255,0.28)'
            return (
              <motion.div
                key={f.arma}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.035, 0.45), duration: 0.35 }}
                whileHover={{ y: -4 }}
                className="card relative overflow-hidden p-4 group"
              >
                {/* Relleno proporcional al lider: el fondo ES el grafico. */}
                <motion.div
                  className="absolute inset-x-0 bottom-0 pointer-events-none"
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(6, (f.valor / maximo) * 100)}%` }}
                  transition={{ delay: 0.15 + Math.min(i * 0.03, 0.4), duration: 0.7, ease: 'easeOut' }}
                  style={{
                    background:
                      i === 0
                        ? 'linear-gradient(0deg, rgba(232,179,60,0.20), transparent)'
                        : 'linear-gradient(0deg, rgba(225,29,60,0.16), transparent)',
                  }}
                />

                <div className="relative flex items-start justify-between mb-3">
                  <span
                    className="font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded"
                    style={{ color: acento, background: `${acento}18` }}
                  >
                    #{i + 1}
                  </span>
                  {podio && (
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: acento }}>
                      {i === 0 ? 'Rey' : 'Podio'}
                    </span>
                  )}
                </div>

                <p className="relative font-display font-bold text-lg leading-tight truncate mb-1">
                  {nombreArma(f.arma)}
                </p>
                <p className="relative text-xs text-white/50 truncate mb-3">{f.nickname}</p>

                <p
                  className="relative font-mono tabular-nums text-2xl font-semibold leading-none"
                  style={{ color: i === 0 ? '#e8b33c' : undefined }}
                >
                  {metrica === 'headshot'
                    ? f.valor.toFixed(1)
                    : Math.round(f.valor).toLocaleString('es')}
                  <span className="text-sm text-white/40">{meta.sufijo}</span>
                </p>
                <p className="relative text-[10px] uppercase tracking-wider text-white/30 mt-1">
                  {meta.label}
                </p>
              </motion.div>
            )
          })}
        </div>
      )}
    </section>
  )
}
