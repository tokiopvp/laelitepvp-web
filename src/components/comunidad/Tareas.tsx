'use client'

import { useMemo, useState } from 'react'
import { Check, Lock, Coins } from 'lucide-react'
import { cobrarTarea, coinsCorto } from '@/lib/economia'
import type { Tarea, Progreso } from '@/lib/economia'

/**
 * Las tareas que dan Elite Coin.
 *
 * UNA SOLA LISTA, NO DOS PESTAÑAS
 * -------------------------------
 * Antes había dos carriles separados —Comunidad y Clan— y eso escondía la
 * mitad del juego: quien abría la página veía una pestaña, no sabía que la otra
 * existía, y las que tenía a tiro hoy podían estar justo en la que no miraba.
 * Peor aún, un miembro del clan puede cobrar LAS DOS, así que separarlas
 * sugería una elección que no existe.
 *
 * Ahora es una lista con un distintivo por tarea que dice de dónde sale:
 * Discord, Free Fire, Honor o Web. Es la misma información sin obligar a
 * navegar.
 *
 * AGRUPADAS POR CUÁNDO VUELVEN
 * ----------------------------
 * Los grupos son "cada día", "cada semana" y "una vez" porque eso es lo único
 * que hay que decidir al mirar la lista: qué me da tiempo a hacer hoy y qué
 * puedo dejar. El origen es una etiqueta; la periodicidad es una decisión.
 *
 * POR QUÉ CADA TAREA MUESTRA SU PROGRESO
 * --------------------------------------
 * Un botón "Cobrar" que solo al pulsarlo te dice que no llegas convierte la
 * lista en una lotería. Viendo "180 / 250" se sabe cuál está a tiro, y esa
 * barra a punto de llenarse es literalmente el motivo para jugar una partida
 * más. El número lo calcula el servidor con la misma lógica que paga, así que
 * una barra llena siempre se puede cobrar.
 */

/** De dónde sale cada tarea. Se deduce de la métrica, que es lo que de verdad
 *  se mide: `publico` solo dice quién puede cobrarla. */
function origen(metrica: string): { texto: string; clase: string } {
  if (metrica.startsWith('discord_'))
    return { texto: 'Discord', clase: 'text-indigo-300 border-indigo-400/30 bg-indigo-500/10' }
  if (metrica.startsWith('honor'))
    return { texto: 'Honor', clase: 'text-orange-300 border-orange-400/30 bg-orange-500/10' }
  if (metrica === 'checkin' || metrica === 'manual' || metrica === 'booster')
    return { texto: 'Web', clase: 'text-white/50 border-white/15 bg-white/[0.05]' }
  return { texto: 'Free Fire', clase: 'text-amber-300 border-amber-400/30 bg-amber-500/10' }
}

const GRUPOS = [
  { id: 'diaria', titulo: 'Cada día', pie: 'Se reinician a medianoche' },
  { id: 'semanal', titulo: 'Cada semana', pie: 'Se reinician el lunes' },
  { id: 'unica', titulo: 'Una sola vez', pie: 'Hitos que se cobran y no vuelven' },
] as const

/** 2.5 → "2,5", 180 → "180". Los K/D llevan decimal; las kills no. */
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
  // "Solo las que puedo cobrar" es el filtro que de verdad se usa: con
  // cuarenta y ocho tareas, lo que importa es cuáles están a tiro AHORA.
  const [soloListas, setSoloListas] = useState(false)

  const estado = (t: Tarea) => {
    const p = progreso.get(t.id)
    const hecha = !!p?.cobrada
    const bloqueada = t.publico === 'clan' && !esMiembro
    const listo = !!p && !hecha && !bloqueada && p.progreso >= p.objetivo
    return { p, hecha, bloqueada, listo }
  }

  // Cuánto hay cobrable ahora mismo. Es lo primero que quiere saber quien abre
  // la página, y antes había que recorrer las dos pestañas para averiguarlo.
  const cobrable = useMemo(() => {
    let n = 0
    let coins = 0
    for (const t of tareas) {
      const { listo, p } = estado(t)
      if (listo) {
        n += 1
        coins += p?.coins ?? t.coins
      }
    }
    return { n, coins }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareas, progreso, esMiembro])

  const porGrupo = useMemo(() => {
    return GRUPOS.map((g) => ({
      ...g,
      items: tareas
        .filter((t) => t.periodo === g.id)
        .filter((t) => !soloListas || estado(t).listo)
        // Lo cobrable primero, lo ya hecho al final. Sin esto, las tareas
        // completadas empujan hacia abajo lo que se puede cobrar hoy.
        .sort((a, b) => {
          const peso = (t: Tarea) => {
            const { hecha, listo, bloqueada } = estado(t)
            return hecha ? 3 : bloqueada ? 2 : listo ? 0 : 1
          }
          return peso(a) - peso(b) || a.orden - b.orden
        }),
    })).filter((g) => g.items.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tareas, progreso, esMiembro, soloListas])

  const cobrar = async (t: Tarea) => {
    if (!autenticado) return onEntrar()
    setOcupado(t.id)
    const r = await cobrarTarea(t.id)
    setOcupado(null)
    if (r.ok) {
      onCobro(`+${coinsCorto(r.coins ?? 0)} Elite Coin`, true)
    } else if (r.progreso !== undefined) {
      onCobro(`Vas ${cifra(Math.floor(r.progreso))} de ${cifra(r.objetivo ?? 0)}. Sigue.`, false)
    } else {
      onCobro(r.error || 'No se pudo cobrar.', false)
    }
  }

  return (
    <section className="card-glow overflow-hidden">
      <header className="p-4 sm:p-5 border-b border-white/[0.06]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-bold text-xl">Tareas</h2>
            <p className="text-white/45 text-xs mt-0.5">
              Todo en una lista. El distintivo dice de dónde sale cada una.
            </p>
          </div>

          {autenticado && cobrable.n > 0 && (
            <button
              onClick={() => setSoloListas((v) => !v)}
              className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-display font-bold transition-colors ${
                soloListas
                  ? 'border-elite-gold/60 bg-elite-gold/15 text-elite-gold'
                  : 'border-elite-gold/35 bg-elite-gold/[0.07] text-elite-gold hover:bg-elite-gold/15'
              }`}
            >
              <Coins className="w-4 h-4" />
              {cobrable.n} {cobrable.n === 1 ? 'lista' : 'listas'} ·{' '}
              {coinsCorto(cobrable.coins)}
            </button>
          )}
        </div>

        {/* Leyenda. Sin ella, el distintivo es un color más; con ella, se
            entiende el mapa entero de la economía en una línea. */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {[
            ['Discord', 'Hablar y estar en voz'],
            ['Free Fire', 'Tus estadísticas reales'],
            ['Honor', 'El honor que haces al clan'],
            ['Web', 'Entrar y vincular tu cuenta'],
          ].map(([n, d]) => {
            const o = origen(
              n === 'Discord' ? 'discord_msgs' : n === 'Honor' ? 'honor_dia' : n === 'Web' ? 'checkin' : 'kills'
            )
            return (
              <span
                key={n}
                className={`text-[10px] px-2 py-1 rounded-md border ${o.clase}`}
                title={d}
              >
                {n}
                <span className="text-white/30 ml-1.5 hidden sm:inline">{d}</span>
              </span>
            )
          })}
        </div>

        {!esMiembro && (
          <p className="text-xs text-white/40 mt-3">
            Las de <b className="text-amber-300/80">Free Fire</b> y{' '}
            <b className="text-orange-300/80">Honor</b> son solo para miembros del clan.{' '}
            <a href="/mi" className="text-elite-primary hover:underline">
              Vincula tu ID
            </a>{' '}
            para desbloquearlas.
          </p>
        )}
      </header>

      <div className="max-h-[520px] overflow-y-auto">
        {porGrupo.length === 0 && (
          <p className="p-6 text-center text-sm text-white/40">
            Ahora mismo no tienes ninguna lista para cobrar.
          </p>
        )}

        {porGrupo.map((g) => (
          <div key={g.id}>
            <div className="sticky top-0 z-10 flex items-baseline gap-2 px-4 sm:px-5 py-2 bg-elite-card/95 backdrop-blur border-y border-white/[0.05]">
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-white/70">
                {g.titulo}
              </h3>
              <span className="text-[10px] text-white/30">{g.pie}</span>
              <span className="ml-auto text-[10px] font-mono text-white/25">{g.items.length}</span>
            </div>

            {/* En pantallas anchas van a dos columnas: con cuarenta y ocho
                tareas, una sola columna en un monitor deja media pantalla
                vacía y obliga a rodar el doble. */}
            {/* El separador va en cada fila, NO con `divide-y`.
                `divide-y` de Tailwind pone borde ARRIBA y fuerza el de abajo a
                cero, y lo hace con un selector de hermanos que gana en
                especificidad a la clase de la fila: en dos columnas solo la
                primera tarjeta acababa teniendo linea. */}
            <ul className="grid xl:grid-cols-2">
              {g.items.map((t) => {
                const { p, hecha, bloqueada, listo } = estado(t)
                const o = origen(t.metrica)
                // Solo tiene sentido dibujar barra donde hay recorrido: en un
                // check-in de "1 de 1" la barra es ruido.
                const conBarra = !!p && !hecha && !bloqueada && t.objetivo > 1
                const pct = p ? Math.min(100, (p.progreso / (p.objetivo || 1)) * 100) : 0

                return (
                  <li
                    key={t.id}
                    className={`flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.04] transition-colors ${
                      listo ? 'bg-elite-gold/[0.07]' : hecha ? 'opacity-45' : ''
                    }`}
                  >
                    <span className="text-xl w-8 text-center shrink-0" aria-hidden>
                      {t.icono || '⚔️'}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`font-display font-bold text-sm ${
                            hecha ? 'text-white/40 line-through' : 'text-white'
                          }`}
                        >
                          {t.titulo}
                        </h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${o.clase}`}>
                          {o.texto}
                        </span>
                        {listo && (
                          <span className="text-[10px] text-elite-gold font-display font-bold">
                            ¡LISTA!
                          </span>
                        )}
                      </div>

                      <p className="text-white/45 text-xs mt-0.5 leading-snug">{t.descripcion}</p>

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
                          <span className="text-[10px] font-mono text-white/40 tabular-nums">
                            {cifra(p!.progreso)} / {cifra(t.objetivo)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Lo que cobra ESTA persona, no lo que dice la tabla.
                        Un no miembro cobra el 45% y un booster el doble:
                        enseñar la cifra base y pagar otra se lee como engaño. */}
                    <span className="font-mono font-bold text-sm text-elite-gold tabular-nums shrink-0">
                      +{coinsCorto(p?.coins ?? t.coins)}
                    </span>

                    <button
                      onClick={() => cobrar(t)}
                      disabled={hecha || bloqueada || ocupado === t.id}
                      className={`shrink-0 w-[86px] min-h-[40px] rounded-lg px-2 text-xs font-display font-bold border transition-colors ${
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
                        <span className="inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Clan
                        </span>
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
          </div>
        ))}
      </div>
    </section>
  )
}
