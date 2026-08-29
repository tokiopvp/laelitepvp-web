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
      <header className="p-4 sm:p-5 border-b border-white/[0.06] flex items-end justify-between gap-4">
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

      <div className="grid sm:grid-cols-2 gap-px bg-white/[0.04]">
        {items.map((it) => {
          const c = COLOR_RAREZA[it.rareza]
          const bloqueado = it.solo_clan && !esMiembro
          const alcanza = saldo >= it.precio_coins
          const pct = Math.min(100, (saldo / it.precio_coins) * 100)
          const agotado = it.stock === 0

          return (
            <article
              key={it.id}
              className={`relative p-4 bg-elite-card ${c.fondo} flex flex-col gap-3`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-base leading-tight">{it.nombre}</h3>
                  <p className="text-white/40 text-xs mt-1 leading-snug">{it.descripcion}</p>
                </div>
                <span
                  className={`shrink-0 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border ${c.borde} ${c.texto}`}
                >
                  {c.etiqueta}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                {it.diamantes && (
                  <span className="inline-flex items-center gap-1 text-elite-live font-mono">
                    <Gem className="w-3 h-3" /> {it.diamantes.toLocaleString('es')}
                  </span>
                )}
                {it.valor_usd && (
                  <span className="text-white/30 font-mono">≈ ${Number(it.valor_usd).toFixed(2)}</span>
                )}
                {it.limite_dia > 0 && (
                  <span className="text-white/30">· {it.limite_dia}/día</span>
                )}
                {it.stock > 0 && <span className="text-amber-400/70">· quedan {it.stock}</span>}
              </div>

              {/* Cuánto falta. Es la parte que engancha: ver la barra a 80%
                  hace que la última tarea del día se haga. */}
              {autenticado && !alcanza && !bloqueado && (
                <div>
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-elite-gold/70 transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/30 mt-1 font-mono">
                    faltan {coinsCorto(it.precio_coins - saldo)}
                  </p>
                </div>
              )}

              <button
                onClick={() => pedir(it)}
                disabled={ocupado === it.id || agotado || bloqueado || (autenticado && !alcanza)}
                className={`mt-auto w-full min-h-[44px] rounded-lg px-3 py-2 text-sm font-display font-bold transition-colors border ${
                  agotado || bloqueado || (autenticado && !alcanza)
                    ? 'border-white/[0.06] text-white/25 cursor-not-allowed'
                    : `${c.borde} ${c.texto} hover:bg-white/[0.06]`
                }`}
              >
                {agotado ? (
                  'Agotado'
                ) : bloqueado ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Solo miembros
                  </span>
                ) : ocupado === it.id ? (
                  'Canjeando…'
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    {autenticado && alcanza && <Check className="w-3.5 h-3.5" />}
                    {coinsCorto(it.precio_coins)} coins
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
