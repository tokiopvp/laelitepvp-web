'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Coins, Gem } from 'lucide-react'
import { getTienda, coinsCorto, COLOR_RAREZA } from '@/lib/economia'
import type { ItemTienda } from '@/lib/economia'

/**
 * "Esto también se consigue gratis".
 *
 * POR QUÉ ESTÁ EN LA TIENDA DE PAGO
 * ---------------------------------
 * Quien llega a PagoStore ya quiere diamantes: es el momento con más intención
 * de compra de todo el sitio. Justo ahí es donde enterarse de que los mismos
 * diamantes se pueden ganar jugando convierte a un visitante que quizá no tiene
 * dinero hoy —la mayoría del público— en alguien que se mete al Discord esta
 * noche. El que sí va a pagar, paga igual: el bloque va DEBAJO del catálogo, no
 * delante, para no interrumpir a quien ya venía decidido.
 *
 * Se muestran los premios más baratos, no los gordos. Un premio de un millón
 * de coins como primer contacto se lee como imposible y desanima; uno de
 * 2.500 se lee como "esto lo hago esta semana".
 */
export default function PuenteEliteCoin() {
  const [items, setItems] = useState<ItemTienda[]>([])

  useEffect(() => {
    // Solo lo alcanzable, y solo lo que no exige ser del clan: quien está aquí
    // todavía no es miembro, y un premio bloqueado no invita a nada.
    getTienda().then((t) =>
      setItems(t.filter((i) => !i.solo_clan).slice(0, 4))
    )
  }, [])

  if (items.length === 0) return null

  return (
    <section className="mt-16">
      <div className="rounded-2xl border border-elite-gold/25 bg-gradient-to-b from-elite-gold/[0.07] to-transparent p-6 sm:p-8">
        <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-elite-gold/10 border border-elite-gold/30 mb-3">
              <Coins className="w-3.5 h-3.5 text-elite-gold" />
              <span className="text-xs font-medium text-elite-gold">SIN PAGAR</span>
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl">
              Estos mismos diamantes, <span className="text-elite-gold">gratis</span>
            </h2>
            <p className="text-white/60 text-sm mt-2 max-w-xl">
              Gana Elite Coin jugando PvP y estando activo en nuestro Discord, y cámbialas por
              recargas reales. Lo paga el clan.
            </p>
          </div>

          <Link
            href="/comunidad"
            className="btn-primary inline-flex items-center gap-2 shrink-0 min-h-[44px]"
          >
            Ver cómo se gana <ArrowRight className="w-4 h-4" />
          </Link>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((it) => {
            const c = COLOR_RAREZA[it.rareza]
            return (
              <Link
                key={it.id}
                href="/comunidad"
                className={`rounded-xl border ${c.borde} ${c.fondo} p-4 hover:bg-white/[0.05] transition-colors group`}
              >
                <p className="font-display font-bold text-base leading-tight group-hover:text-elite-gold transition-colors">
                  {it.nombre}
                </p>
                {it.diamantes && (
                  <p className="inline-flex items-center gap-1 text-elite-live text-xs font-mono mt-1">
                    <Gem className="w-3 h-3" /> {it.diamantes.toLocaleString('es')}
                  </p>
                )}
                <p className="font-mono font-bold text-elite-gold text-sm mt-3">
                  {coinsCorto(it.precio_coins)} coins
                </p>
                {it.limite_dia > 0 && (
                  <p className="text-white/30 text-[11px] mt-0.5">canjeable cada día</p>
                )}
              </Link>
            )
          })}
        </div>

        <p className="text-white/35 text-xs mt-5">
          Tareas simples: entrar al Discord, hablar, jugar partidas. Los premios grandes exigen
          ser miembro del clan.
        </p>
      </div>
    </section>
  )
}
