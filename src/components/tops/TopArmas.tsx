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
        <div className="card overflow-hidden">
          {filas.map((f, i) => (
            <motion.div
              key={f.arma}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.4) }}
              className="relative flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] last:border-0"
            >
              {/* Barra proporcional al mejor: se compara de un vistazo. */}
              <div
                className="absolute inset-y-0 left-0 pointer-events-none"
                style={{
                  width: `${Math.max(3, (f.valor / maximo) * 100)}%`,
                  background:
                    'linear-gradient(90deg, rgba(225,29,60,0.16), rgba(225,29,60,0.02))',
                }}
              />
              <span className="relative w-6 shrink-0 text-xs font-mono tabular-nums text-white/35">
                {i + 1}
              </span>
              <span className="relative font-display font-semibold w-28 shrink-0 truncate">
                {nombreArma(f.arma)}
              </span>
              <span className="relative flex-1 min-w-0 text-sm text-white/65 truncate">
                {f.nickname}
              </span>
              <span
                className="relative font-mono tabular-nums text-sm shrink-0"
                style={{ color: i === 0 ? '#e8b33c' : undefined }}
              >
                {metrica === 'headshot' ? f.valor.toFixed(1) : Math.round(f.valor).toLocaleString('es')}
                {meta.sufijo}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}
