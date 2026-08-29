'use client'

import { useState } from 'react'
import { Check, Lock } from 'lucide-react'
import { cobrarTarea, coinsCorto } from '@/lib/economia'
import type { Tarea } from '@/lib/economia'

/**
 * Las tareas que dan Elite Coin.
 *
 * DOS CARRILES A PROPÓSITO
 * ------------------------
 * · Comunidad: se cumplen solo por estar en el Discord —escribir, sentarse en
 *   voz, fichar entrada—. Son la puerta de entrada de quien todavía no es del
 *   clan, y las que hacen que el servidor esté vivo a todas horas.
 * · Clan: se comprueban contra los stats de Free Fire que el bot ya sincroniza
 *   (kills, headshots, K/D, Booyahs). No se pueden falsear escribiendo: hay
 *   que jugar.
 *
 * El nivel 1–10 se ve en el badge y es el mismo número que marca el tamaño de
 * la vela que la tarea deja en el gráfico de abajo.
 */

const ETIQUETA_PERIODO: Record<string, string> = {
  diaria: 'Cada día',
  semanal: 'Cada semana',
  unica: 'Una vez',
}

/** Color del nivel: frío abajo, ardiendo arriba. */
function colorNivel(n: number): string {
  if (n <= 2) return 'text-white/40 border-white/15'
  if (n <= 4) return 'text-sky-300 border-sky-400/30'
  if (n <= 6) return 'text-fuchsia-300 border-fuchsia-400/30'
  if (n <= 8) return 'text-amber-300 border-amber-400/40'
  return 'text-elite-primary border-elite-primary/50'
}

export default function Tareas({
  tareas,
  cobradas,
  autenticado,
  esMiembro,
  onCobro,
  onEntrar,
}: {
  tareas: Tarea[]
  cobradas: Set<string>
  autenticado: boolean
  esMiembro: boolean
  onCobro: (mensaje: string, ok: boolean) => void
  onEntrar: () => void
}) {
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [pestana, setPestana] = useState<'todos' | 'clan'>('todos')

  const visibles = tareas.filter((t) => t.publico === pestana)

  const cobrar = async (t: Tarea) => {
    if (!autenticado) return onEntrar()
    setOcupado(t.id)
    const r = await cobrarTarea(t.id)
    setOcupado(null)
    if (r.ok) {
      onCobro(`+${r.coins} Elite Coin · vela de tamaño ${r.vela}`, true)
    } else if (r.progreso !== undefined) {
      // Decir "no llegas" a secas es inútil. Con el progreso real se sabe
      // cuánto falta y si vale la pena intentarlo hoy.
      onCobro(`Vas ${Math.floor(r.progreso)} de ${r.objetivo}. Sigue.`, false)
    } else {
      onCobro(r.error || 'No se pudo cobrar.', false)
    }
  }

  return (
    <section className="card-glow overflow-hidden">
      <header className="p-4 sm:p-5 border-b border-white/[0.06] flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h2 className="font-display font-bold text-xl">Tareas</h2>
          <p className="text-white/40 text-xs mt-0.5">Cada tarea suma coins y mueve el mercado</p>
        </div>
        <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04]">
          {(
            [
              ['todos', 'Comunidad'],
              ['clan', 'Clan'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setPestana(v)}
              className={`px-3 py-1.5 rounded text-xs font-display font-semibold transition-colors ${
                pestana === v ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      {pestana === 'clan' && !esMiembro && (
        <p className="px-4 sm:px-5 py-3 text-xs text-white/40 border-b border-white/[0.06]">
          Estas tareas leen tus estadísticas reales de Free Fire. Vincula tu ID en{' '}
          <a href="/mi" className="text-elite-primary hover:underline">
            tu perfil
          </a>{' '}
          para poder cobrarlas.
        </p>
      )}

      <ul className="divide-y divide-white/[0.04]">
        {visibles.map((t) => {
          const hecha = cobradas.has(t.id)
          const bloqueada = t.publico === 'clan' && !esMiembro
          return (
            <li key={t.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
              <span className="text-lg w-7 text-center shrink-0" aria-hidden>
                {t.icono || '⚔️'}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={`font-display font-semibold text-sm ${
                      hecha ? 'text-white/35 line-through' : ''
                    }`}
                  >
                    {t.titulo}
                  </h3>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${colorNivel(t.nivel)}`}
                    title={`Deja una vela de tamaño ${t.nivel} en el gráfico`}
                  >
                    N{t.nivel}
                  </span>
                  <span className="text-[10px] text-white/25">{ETIQUETA_PERIODO[t.periodo]}</span>
                </div>
                <p className="text-white/40 text-xs mt-0.5 leading-snug">{t.descripcion}</p>
              </div>

              <span className="font-mono font-bold text-sm text-elite-gold tabular-nums shrink-0">
                +{coinsCorto(t.coins)}
              </span>

              <button
                onClick={() => cobrar(t)}
                disabled={hecha || bloqueada || ocupado === t.id}
                className={`shrink-0 w-24 rounded-lg px-3 py-1.5 text-xs font-display font-bold border transition-colors ${
                  hecha
                    ? 'border-elite-success/30 text-elite-success cursor-default'
                    : bloqueada
                      ? 'border-white/[0.06] text-white/25 cursor-not-allowed'
                      : 'border-elite-primary/40 text-elite-primary hover:bg-elite-primary/10'
                }`}
              >
                {hecha ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="w-3 h-3" /> Hecha
                  </span>
                ) : bloqueada ? (
                  <Lock className="w-3 h-3 mx-auto" />
                ) : ocupado === t.id ? (
                  '…'
                ) : (
                  'Cobrar'
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
