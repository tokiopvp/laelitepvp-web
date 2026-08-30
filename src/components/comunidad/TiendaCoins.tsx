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

      {/* Grid de iconos pequeños: cada premio es un cuadro compacto */}
      <div className="p-3 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[360px] overflow-y-auto">
        {items.map((it) => {
          const c = COLOR_RAREZA[it.rareza]
          const bloqueado = it.solo_clan && !esMiembro
          const alcanza = saldo >= it.precio_coins
          const agotado = it.stock === 0
          const deshabilitado = agotado || bloqueado || (autenticado && !alcanza)

          return (
            <button
              key={it.id}
              onClick={() => !deshabilitado && pedir(it)}
              disabled={ocupado === it.id || deshabilitado}
              className={`relative flex flex-col items-center justify-center gap-1 p-3 rounded-xl border transition-all ${
                deshabilitado
                  ? 'border-white/[0.06] bg-white/[0.02] opacity-40 cursor-not-allowed'
                  : `${c.borde} ${c.fondo} hover:scale-[1.03] active:scale-[0.97]`
              }`}
            >
              {/* Icono grande */}
              <div className={`text-2xl ${c.texto}`}>
                {it.diamantes ? '💎' : it.rareza === 'legendario' ? '👑' : it.rareza === 'epico' ? '⚡' : '🎁'}
              </div>

              {/* Nombre cortado */}
              <p className="font-display font-bold text-[11px] leading-tight text-center truncate w-full">
                {it.nombre}
              </p>

              {/* Precio */}
              <span className={`font-mono text-[10px] font-bold ${c.texto}`}>
                {coinsCorto(it.precio_coins)}
              </span>

              {/* Badge de rareza */}
              <span className={`text-[8px] uppercase tracking-wider px-1 py-0.5 rounded ${c.texto} bg-white/[0.05]`}>
                {c.etiqueta}
              </span>

              {/* Stock / estado */}
              {agotado && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl text-[10px] font-bold text-white/60">
                  Agotado
                </span>
              )}
              {bloqueado && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl text-[10px] font-bold text-white/60">
                  <Lock className="w-3 h-3 mr-1" /> Solo clan
                </span>
              )}
              {ocupado === it.id && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl text-[10px] font-bold text-elite-gold">
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
