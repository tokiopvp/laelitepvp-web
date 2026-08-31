'use client'

import { useState } from 'react'
import { Check, Lock } from 'lucide-react'
import { cobrarTarea, coinsCorto } from '@/lib/economia'
import type { Tarea, Progreso } from '@/lib/economia'

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
 * POR QUÉ CADA TAREA MUESTRA SU PROGRESO
 * --------------------------------------
 * Un botón "Cobrar" que solo al pulsarlo te dice que no llegas convierte la
 * lista en una lotería. Viendo "180 / 250" se sabe cuál está a tiro hoy, y esa
 * barra a punto de llenarse es literalmente el motivo para jugar una partida
 * más. El número lo calcula el servidor con la misma lógica que paga, así que
 * una barra llena siempre se puede cobrar.
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

/** 2.5 → "2.5", 180 → "180". Los K/D llevan decimal; las kills no. */
function cifra(n: number): string {
  return Number.isInteger(n) ? n.toLocaleString('es') : n.toFixed(1)
}

export default function Tareas({
  tareas,
  progreso,
  autenticado,
  esMiembro,
  onCobro,
  onEntrar,
}: {
  tareas: Tarea[]
  progreso: Map<string, Progreso>
  autenticado: boolean
  esMiembro: boolean
  onCobro: (mensaje: string, ok: boolean) => void
  onEntrar: () => void
}) {
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [pestana, setPestana] = useState<'todos' | 'clan'>('todos')

  const visibles = tareas
    .filter((t) => t.publico === pestana)
    // Lo cobrable primero, lo ya hecho al final. Sin esto, las tareas
    // completadas del mes pasado empujan hacia abajo lo que se puede cobrar hoy.
    .sort((a, b) => {
      const pa = progreso.get(a.id)
      const pb = progreso.get(b.id)
      const peso = (p?: Progreso) =>
        p?.cobrada ? 2 : p && p.progreso >= p.objetivo ? 0 : 1
      return peso(pa) - peso(pb) || a.orden - b.orden
    })

  const cobrar = async (t: Tarea) => {
    if (!autenticado) return onEntrar()
    setOcupado(t.id)
    const r = await cobrarTarea(t.id)
    setOcupado(null)
    if (r.ok) {
      onCobro(`+${r.coins} Elite Coin · vela de tamaño ${r.vela}`, true)
    } else if (r.progreso !== undefined) {
      onCobro(`Vas ${Math.floor(r.progreso)} de ${r.objetivo}. Sigue.`, false)
    } else {
      onCobro(r.error || 'No se pudo cobrar.', false)
    }
  }

  return (
    <section className="card-glow overflow-hidden">
      <header className="p-4 border-b border-white/[0.06] flex flex-wrap items-center gap-3 justify-between">
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
              className={`px-4 py-2.5 sm:py-1.5 rounded text-xs font-display font-semibold transition-colors ${
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

      {/* Mismo tope que la tienda: veinte tareas seguidas son una pagina
          entera de scroll antes de llegar al ranking. */}
      <ul className="divide-y divide-white/[0.04] max-h-[330px] overflow-y-auto">
        {visibles.map((t) => {
          const p = progreso.get(t.id)
          const hecha = !!p?.cobrada
          const bloqueada = t.publico === 'clan' && !esMiembro
          const listo = !!p && !hecha && p.progreso >= p.objetivo
          // Solo tiene sentido dibujar barra donde hay recorrido: en un
          // check-in de "1 de 1" la barra es ruido.
          const conBarra = !!p && !hecha && !bloqueada && t.objetivo > 1
          const pct = p ? Math.min(100, (p.progreso / (p.objetivo || 1)) * 100) : 0

          return (
            <li
              key={t.id}
              className={`flex items-center gap-3 px-4 sm:px-5 py-3 transition-colors ${
                // Lo cobrable se ilumina: es la llamada a la acción de la lista.
                listo ? 'bg-elite-gold/[0.06]' : ''
              }`}
            >
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
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${colorNivel(t.nivel)}`}
                    title={`Deja una vela de tamaño ${t.nivel} en el gráfico`}
                  >
                    N{t.nivel}
                  </span>
                  <span className="text-[10px] text-white/25">{ETIQUETA_PERIODO[t.periodo]}</span>
                  {listo && (
                    <span className="text-[10px] text-elite-gold font-display font-bold">
                      ¡lista!
                    </span>
                  )}
                </div>

                <p className="text-white/40 text-xs mt-0.5 leading-snug">{t.descripcion}</p>

                {conBarra && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 max-w-[220px] rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-[width] duration-700 ${
                          listo ? 'bg-elite-gold' : 'bg-elite-primary/70'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-white/35 tabular-nums">
                      {cifra(p!.progreso)} / {cifra(t.objetivo)}
                    </span>
                  </div>
                )}
              </div>

              {/* Lo que cobra ESTA persona, no lo que dice la tabla.
                  Un no miembro cobra el 45% y un booster el doble: enseñar la
                  cifra base y pagar otra distinta se lee como un engaño. */}
              <span className="font-mono font-bold text-sm text-elite-gold tabular-nums shrink-0">
                +{coinsCorto(p?.coins ?? t.coins)}
              </span>

              <button
                onClick={() => cobrar(t)}
                disabled={hecha || bloqueada || ocupado === t.id}
                className={`shrink-0 w-24 min-h-[44px] sm:min-h-0 sm:py-1.5 rounded-lg px-3 py-2 text-xs font-display font-bold border transition-colors ${
                  hecha
                    ? 'border-elite-success/30 text-elite-success cursor-default'
                    : bloqueada
                      ? 'border-white/[0.06] text-white/25 cursor-not-allowed'
                      : listo
                        ? 'border-elite-gold/60 text-elite-gold bg-elite-gold/10 hover:bg-elite-gold/20'
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
