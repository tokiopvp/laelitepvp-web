'use client'

import { useState } from 'react'
import { Gem, Lock, Check } from 'lucide-react'
import { canjear, coinsCorto, COLOR_RAREZA } from '@/lib/economia'
import type { ItemTienda } from '@/lib/economia'

/**
 * La tienda de canjes.
 *
 * ORDEN DE LA VITRINA
 * -------------------
 * Los premios se muestran de barato a caro, y el barato es intencionadamente
 * alcanzable en un día. Una tienda donde el primer premio cuesta un millón se
 * lee como decorado y nadie juega: hace falta un canje pequeño y frecuente que
 * demuestre que el circuito funciona antes de que nadie persiga el gordo.
 *
 * Lo que uno NO puede pagar todavía no se esconde. Se muestra con la barra de
 * cuánto le falta, porque ese hueco es exactamente el motivo para volver.
 */

export default function TiendaCoins({
  items,
  saldo,
  autenticado,
  esMiembro,
  onCanje,
  onEntrar,
}: {
  items: ItemTienda[]
  saldo: number
  autenticado: boolean
  esMiembro: boolean
  onCanje: (mensaje: string, ok: boolean) => void
  onEntrar: () => void
}) {
  const [ocupado, setOcupado] = useState<string | null>(null)

  const pedir = async (it: ItemTienda) => {
    if (!autenticado) return onEntrar()
    setOcupado(it.id)
    const r = await canjear(it.id)
    setOcupado(null)
    if (r.ok) {
      onCanje(`Canjeaste ${r.item}. Te contactamos para entregarlo.`, true)
    } else {
      onCanje(
        r.faltan ? `Te faltan ${coinsCorto(r.faltan)} Elite Coin.` : r.error || 'No se pudo canjear.',
        false
      )
    }
  }

  return (
    <section className="card-glow overflow-hidden">
      <header className="p-4 border-b border-white/[0.06] flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl">Tienda Elite</h2>
          <p className="text-white/40 text-xs mt-0.5">Cambia tus coins por diamantes reales</p>
        </div>
        {autenticado && (
          <div className="text-right shrink-0">
            <p className="font-mono font-bold text-lg text-elite-gold tabular-nums leading-none">
              {coinsCorto(saldo)}
            </p>
            <p className="text-[10px] text-white/30">tu saldo</p>
          </div>
        )}
      </header>

      {/* Altura acotada con scroll propio.
          Siete premios seguidos empujan las tareas y el ranking fuera de la
          pantalla, y la pagina obliga a deslizar mucho antes de ver lo
          importante. Con tope, cada bloque ocupa lo suyo y el que quiera ver
          mas premios desliza DENTRO de la tienda. */}
      <div className="divide-y divide-white/[0.04] max-h-[330px] overflow-y-auto">
        {items.map((it) => {
          const c = COLOR_RAREZA[it.rareza]
          const bloqueado = it.solo_clan && !esMiembro
          const alcanza = saldo >= it.precio_coins
          const pct = Math.min(100, (saldo / it.precio_coins) * 100)
          const agotado = it.stock === 0

          return (
            <article key={it.id} className={`flex items-center gap-3 px-4 py-2.5 ${c.fondo}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-bold text-sm leading-tight">{it.nombre}</h3>
                  <span
                    className={`text-[10px] uppercase tracking-widest px-1.5 rounded border ${c.borde} ${c.texto}`}
                  >
                    {c.etiqueta}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-[11px] mt-0.5">
                  {it.diamantes && (
                    <span className="inline-flex items-center gap-1 text-elite-live font-mono">
                      <Gem className="w-3 h-3" /> {it.diamantes.toLocaleString('es')}
                    </span>
                  )}
                  {it.valor_usd && (
                    <span className="text-white/30 font-mono">≈ ${Number(it.valor_usd).toFixed(2)}</span>
                  )}
                  {it.limite_dia > 0 && <span className="text-white/30">· {it.limite_dia}/día</span>}
                  {it.stock > 0 && <span className="text-amber-400/70">· quedan {it.stock}</span>}
                </div>

                {/* Cuánto falta. Es la parte que engancha: ver la barra a 80%
                    hace que la última tarea del día se haga. */}
                {autenticado && !alcanza && !bloqueado && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="h-1 flex-1 max-w-[160px] rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-elite-gold/70 transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/30 font-mono">
                      faltan {coinsCorto(it.precio_coins - saldo)}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => pedir(it)}
                disabled={ocupado === it.id || agotado || bloqueado || (autenticado && !alcanza)}
                className={`shrink-0 w-28 min-h-[40px] rounded-lg px-2 py-1.5 text-xs font-display font-bold transition-colors border ${
                  agotado || bloqueado || (autenticado && !alcanza)
                    ? 'border-white/[0.06] text-white/25 cursor-not-allowed'
                    : `${c.borde} ${c.texto} hover:bg-white/[0.06]`
                }`}
              >
                {agotado ? (
                  'Agotado'
                ) : bloqueado ? (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Solo clan
                  </span>
                ) : ocupado === it.id ? (
                  '…'
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {autenticado && alcanza && <Check className="w-3 h-3" />}
                    {coinsCorto(it.precio_coins)}
                  </span>
                )}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
