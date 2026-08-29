'use client'

import { Crown, Medal } from 'lucide-react'
import { coinsCorto } from '@/lib/economia'
import type { FilaTop } from '@/lib/economia'

/**
 * El ranking de Elite Coin.
 *
 * Es lo primero que se ve al entrar, junto a la tienda, y a propósito: la
 * pregunta que trae a alguien a esta página es "¿quién va ganando y qué me
 * llevo yo?". Todo lo demás —tareas, gráfico— responde a eso.
 *
 * Los tres primeros se destacan; del cuarto en adelante la lista se aprieta,
 * porque el puesto 27 no necesita el mismo espacio que el podio.
 */

const CORONA = (i: number) => {
  if (i === 0) return <Crown className="w-4 h-4 text-elite-gold" />
  if (i === 1) return <Medal className="w-4 h-4 text-white/60" />
  if (i === 2) return <Medal className="w-4 h-4 text-amber-700" />
  return <span className="text-white/30 font-mono text-xs tabular-nums">{i + 1}</span>
}

export default function TopCoins({
  filas,
  yo,
  cargando,
}: {
  filas: FilaTop[]
  yo?: string | null
  cargando?: boolean
}) {
  return (
    <section className="card-glow overflow-hidden flex flex-col">
      <header className="p-4 border-b border-white/[0.06]">
        <h2 className="font-display font-bold text-xl">Top Elite Coin</h2>
        <p className="text-white/40 text-xs mt-0.5">Quién manda en la comunidad</p>
      </header>

      {cargando ? (
        <div className="p-8 text-center text-white/30 text-sm">Cargando ranking…</div>
      ) : filas.length === 0 ? (
        <div className="p-8 text-center text-white/30 text-sm">
          Todavía no hay nadie. Sé el primero.
        </div>
      ) : (
        <ol className="divide-y divide-white/[0.04] max-h-[380px] overflow-y-auto">
          {filas.map((f, i) => {
            const mio = !!yo && f.id === yo
            return (
              <li
                key={f.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  // Tu propia fila se resalta: en una lista de cincuenta, sin
                  // esto hay que ir leyendo nombre a nombre para encontrarse.
                  mio ? 'bg-elite-primary/[0.08] border-l-2 border-elite-primary' : ''
                }`}
              >
                <span className="w-6 flex justify-center shrink-0">{CORONA(i)}</span>

                {f.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.avatar_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-white/5 grid place-items-center text-xs font-display font-bold text-white/40 shrink-0">
                    {f.nombre.charAt(0).toUpperCase()}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-sm truncate">
                    {f.nombre}
                    {mio && <span className="text-elite-primary text-xs ml-1.5">· tú</span>}
                  </p>
                  {f.es_miembro ? (
                    <span className="text-[10px] text-elite-primary">Miembro del clan</span>
                  ) : (
                    <span className="text-[10px] text-white/25">Comunidad</span>
                  )}
                </div>

                <span className="font-mono font-bold text-sm tabular-nums text-elite-gold shrink-0">
                  {coinsCorto(f.coins)}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
