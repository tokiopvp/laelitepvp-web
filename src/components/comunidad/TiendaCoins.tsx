'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { canjear, coinsCorto, COLOR_RAREZA } from '@/lib/economia'
import type { ItemTienda } from '@/lib/economia'

/**
 * La tienda de canjes.
 *
 * ORDEN DE LA VITRINA
 * -------------------
 * Los premios van de barato a caro, y el barato es intencionadamente
 * alcanzable pronto. Una tienda donde el primer premio cuesta un millón se lee
 * como decorado y nadie juega: hace falta un canje pequeño que demuestre que
 * el circuito funciona antes de que nadie persiga el gordo.
 *
 * LO QUE NO SE PUEDE PAGAR NO SE APAGA
 * ------------------------------------
 * Antes todo lo inalcanzable iba con `opacity-40`. Con los precios nuevos eso
 * son NUEVE de los once premios, o sea que la vitrina entera se veía gris y
 * borrosa: justo los premios que tienen que dar ganas de volver eran los que
 * no se leían.
 *
 * Ahora se ven enteros y con su precio en grande, y lo que marca que todavía
 * no alcanzas es una BARRA de cuánto llevas. Ese hueco es el motivo de volver;
 * esconderlo detrás de una capa de opacidad lo desperdicia.
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
          <p className="text-white/45 text-xs mt-0.5">Cambia tus coins por diamantes reales</p>
        </div>
        {autenticado && (
          <div className="text-right shrink-0">
            <p className="font-mono font-bold text-lg text-elite-gold tabular-nums leading-none">
              {coinsCorto(saldo)}
            </p>
            <p className="text-[10px] text-white/40">tu saldo</p>
          </div>
        )}
      </header>

      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[560px] overflow-y-auto">
        {items.map((it) => {
          const c = COLOR_RAREZA[it.rareza]
          const bloqueado = it.solo_clan && !esMiembro
          const alcanza = saldo >= it.precio_coins
          const agotado = it.stock === 0
          const deshabilitado = agotado || bloqueado || (autenticado && !alcanza)
          // Cuánto llevas de este premio. Solo tiene sentido con sesión
          // iniciada: sin saldo real, una barra al 0% no dice nada.
          const avance = autenticado && it.precio_coins > 0
            ? Math.min(100, (saldo / it.precio_coins) * 100)
            : 0

          return (
            <button
              key={it.id}
              onClick={() => !deshabilitado && pedir(it)}
              disabled={ocupado === it.id || deshabilitado}
              className={`relative flex flex-col items-center gap-1.5 p-3.5 rounded-xl border text-center transition-all ${c.borde} ${c.fondo} ${
                deshabilitado
                  ? 'cursor-not-allowed'
                  : 'hover:scale-[1.03] active:scale-[0.97] cursor-pointer'
              }`}
            >
              <div className="text-3xl leading-none">
                {it.diamantes ? '💎' : it.rareza === 'legendario' ? '👑' : it.rareza === 'epico' ? '⚡' : '🎁'}
              </div>

              {/* El nombre puede ocupar dos líneas: "Cuenta Sakura + HipHop"
                  cortado a una sola no se entiende. */}
              <p className="font-display font-bold text-sm leading-tight text-white w-full">
                {it.nombre}
              </p>

              {/* El precio es lo que la gente compara. Va en grande y en el
                  dorado de las coins, no en el color de la rareza. */}
              <span className="font-mono font-bold text-base text-elite-gold tabular-nums leading-none">
                {coinsCorto(it.precio_coins)}
              </span>

              <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${c.texto} bg-white/[0.06]`}>
                {c.etiqueta}
              </span>

              {/* Cuánto te falta. Es la parte que engancha: ver la barra a
                  medias vale mucho más que ver el premio apagado. */}
              {autenticado && !alcanza && !bloqueado && !agotado && (
                <div className="w-full mt-0.5">
                  <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-elite-gold/70"
                      style={{ width: `${avance}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/45 mt-1 tabular-nums">
                    te faltan {coinsCorto(it.precio_coins - saldo)}
                  </p>
                </div>
              )}

              {autenticado && alcanza && !bloqueado && !agotado && (
                <span className="text-[10px] font-display font-bold text-elite-success mt-0.5">
                  Canjear
                </span>
              )}

              {agotado && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl text-xs font-display font-bold text-white/70">
                  Agotado
                </span>
              )}
              {bloqueado && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl text-xs font-display font-bold text-white/70">
                  <Lock className="w-3.5 h-3.5 mr-1" /> Solo clan
                </span>
              )}
              {ocupado === it.id && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-xl text-xs font-display font-bold text-elite-gold">
                  Canjeando…
                </span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
