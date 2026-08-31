'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Check, Lock } from 'lucide-react'
import { cobrarTarea, coinsCorto } from '@/lib/economia'
import type { Tarea, Progreso } from '@/lib/economia'

/**
 * Ser booster del Discord: qué te da y qué puedes cobrar.
 *
 * POR QUE UNA SECCION APARTE Y NO MEZCLADAS CON LAS DEMAS
 * ------------------------------------------------------
 * Mezcladas se perdían. Salían entre cuarenta tareas, bloqueadas y sin
 * explicación, y quien no era booster solo veía tres candados más: cero
 * motivo para plantearse pagar el refuerzo del servidor.
 *
 * Aquí se explica primero el trato completo y después se enseña lo que hay que
 * cobrar. Esa es la diferencia entre una tarea bloqueada y una oferta.
 *
 * ESTA ABIERTA A TODO EL MUNDO A PROPOSITO
 * ----------------------------------------
 * El multiplicador vale también fuera del clan, y eso es el gancho: un no
 * miembro cobra el 45%, pero si mejora el servidor cobra el 90%, casi lo
 * mismo que alguien del clan. Es la única forma que tiene la gente de fuera de
 * competir de verdad, y de paso el servidor sube de nivel.
 */

export default function Boosters({
  tareas,
  progreso,
  autenticado,
  esBooster,
  onCobro,
  onEntrar,
}: {
  tareas: Tarea[]
  progreso: Map<string, Progreso>
  autenticado: boolean
  esBooster: boolean
  onCobro: (mensaje: string, ok: boolean) => void
  onEntrar: () => void
}) {
  const [ocupado, setOcupado] = useState<string | null>(null)

  if (tareas.length === 0) return null

  const cobrar = async (t: Tarea) => {
    if (!autenticado) return onEntrar()
    setOcupado(t.id)
    const r = await cobrarTarea(t.id)
    setOcupado(null)
    onCobro(r.ok ? `+${coinsCorto(r.coins ?? 0)} Elite Coin` : r.error || 'No se pudo cobrar.', r.ok)
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/[0.05] overflow-hidden"
    >
      <header className="p-5 border-b border-fuchsia-400/15">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl flex items-center gap-2 text-fuchsia-200">
              <Sparkles className="w-5 h-5" />
              Mejora el servidor y cobra el doble
            </h2>
            <p className="text-white/50 text-sm mt-1 max-w-2xl">
              Si le das un <b className="text-fuchsia-200">Boost</b> al Discord de La Elite PvP,
              todo lo que ganes se multiplica por 2 y se te abren tres misiones que nadie más
              puede cobrar.
            </p>
          </div>

          {autenticado && (
            <span
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-display font-bold border ${
                esBooster
                  ? 'border-fuchsia-400/50 bg-fuchsia-500/15 text-fuchsia-200'
                  : 'border-white/10 bg-white/[0.04] text-white/40'
              }`}
            >
              {esBooster ? '✦ Eres booster' : 'Todavía no eres booster'}
            </span>
          )}
        </div>

        {/* El trato, en cifras. Decir "el doble" sin decir el doble DE QUE no
            convence a nadie a gastar dinero en un refuerzo. */}
        <div className="grid sm:grid-cols-3 gap-2.5 mt-4">
          <Ventaja
            titulo="×2 en todo"
            texto="Tareas, honor, voz y mensajes. Cada minuto en un canal de voz pasa de 1 a 2 coins."
          />
          <Ventaja
            titulo="Aunque no seas del clan"
            texto="De fuera se cobra el 45%. Con boost, el 90%: casi lo mismo que un miembro."
          />
          <Ventaja
            titulo="Misiones propias"
            texto="Una de bienvenida que se cobra una vez, más una diaria y una semanal."
          />
        </div>
      </header>

      <div className="p-4 space-y-2">
        {!autenticado && (
          <p className="text-sm text-white/45 pb-1">
            Entra con Discord para ver y cobrar estas misiones.
          </p>
        )}

        {tareas.map((t) => {
          const p = progreso.get(t.id)
          const hecha = !!p?.cobrada
          // Sin boost la misión se ve entera, pero no se puede cobrar. Ver lo
          // que te estás perdiendo es justo el motivo para dar el boost.
          const bloqueada = autenticado && !esBooster
          const paga = p?.coins ?? t.coins

          return (
            <div
              key={t.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
            >
              <span className="text-2xl leading-none shrink-0">{t.icono || '✨'}</span>

              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-sm text-white flex items-center gap-2">
                  {t.titulo}
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-white/45">
                    {t.periodo === 'unica' ? 'una vez' : t.periodo}
                  </span>
                </p>
                <p className="text-white/45 text-xs mt-0.5">{t.descripcion}</p>
              </div>

              <span className="font-mono font-bold text-base text-elite-gold tabular-nums shrink-0">
                +{coinsCorto(paga)}
              </span>

              <button
                onClick={() => cobrar(t)}
                disabled={hecha || bloqueada || ocupado === t.id}
                className={`shrink-0 w-24 min-h-[40px] rounded-lg px-3 text-xs font-display font-bold border transition-colors ${
                  hecha
                    ? 'border-elite-success/30 text-elite-success cursor-default'
                    : bloqueada
                      ? 'border-white/10 text-white/30 cursor-not-allowed'
                      : 'border-fuchsia-400/40 text-fuchsia-200 hover:bg-fuchsia-500/15'
                }`}
              >
                {hecha ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> Hecha
                  </span>
                ) : bloqueada ? (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Con boost
                  </span>
                ) : ocupado === t.id ? (
                  '…'
                ) : (
                  'Cobrar'
                )}
              </button>
            </div>
          )
        })}
      </div>

      {(!autenticado || !esBooster) && (
        <footer className="px-4 pb-4">
          <p className="text-xs text-white/40">
            El boost se da desde Discord: entra al servidor, pulsa el nombre arriba del todo y
            elige <b className="text-white/60">Mejorar servidor</b>. El multiplicador se te activa
            solo, en menos de media hora.
          </p>
        </footer>
      )}
    </motion.section>
  )
}

function Ventaja({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-xl bg-black/25 border border-fuchsia-400/15 p-3">
      <p className="font-display font-bold text-sm text-fuchsia-200">{titulo}</p>
      <p className="text-white/50 text-xs mt-1 leading-relaxed">{texto}</p>
    </div>
  )
}
