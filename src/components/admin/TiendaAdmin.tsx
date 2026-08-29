'use client'

import { useState } from 'react'
import { Plus, Copy, Trash2, ArrowUp, ArrowDown, Check } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { ItemTienda, Rareza } from '@/lib/economia'

/**
 * Gestión de la tienda de Elite Coin.
 *
 * QUÉ ESTABA MAL ANTES
 * --------------------
 * Era una tabla que solo permitía editar lo que ya existía: no había forma de
 * AÑADIR un premio ni de borrarlo. Para meter uno nuevo había que entrar a
 * Supabase y escribir SQL, lo cual convierte "poner un premio de temporada" en
 * una tarea de programador en vez de en algo que se hace desde el móvil.
 *
 * Ahora: alta en una fila, duplicar (que es como se crean el 90% de los
 * premios: el mismo con otro precio), borrar, y reordenar la vitrina con
 * flechas. Todo se guarda al salir del campo, sin botón de guardar global que
 * obligue a recordar qué se tocó.
 */

const RAREZAS: Rareza[] = ['basura', 'normal', 'epico', 'legendario']

/** Un premio nuevo empieza con valores sensatos, no vacío. */
const NUEVO = {
  nombre: 'Premio nuevo',
  descripcion: '',
  precio_coins: 10000,
  diamantes: null as number | null,
  valor_usd: null as number | null,
  rareza: 'normal' as Rareza,
  stock: -1,
  limite_dia: 0,
  solo_clan: false,
  activo: false, // Nace APAGADO: nadie ve un premio a medio configurar.
}

export default function TiendaAdmin({
  items,
  onCambio,
  avisar,
}: {
  items: ItemTienda[]
  onCambio: () => void
  avisar: (t: string) => void
}) {
  const [ocupado, setOcupado] = useState<string | null>(null)

  const sb = () => supabaseBrowser()

  const guardar = async (id: string, campo: keyof ItemTienda, valor: unknown) => {
    const c = sb()
    if (!c) return
    const { error } = await c.from('shop_items').update({ [campo]: valor }).eq('id', id)
    avisar(error ? error.message : 'Guardado ✓')
    if (!error) onCambio()
  }

  const crear = async (base?: ItemTienda) => {
    const c = sb()
    if (!c) return
    setOcupado('nuevo')
    // Al duplicar se copia todo menos la identidad y el orden, y se deja
    // apagado: así se ajusta el precio antes de que nadie pueda canjearlo.
    const fila = base
      ? {
          nombre: base.nombre + ' (copia)',
          descripcion: base.descripcion,
          precio_coins: base.precio_coins,
          diamantes: base.diamantes,
          valor_usd: base.valor_usd,
          rareza: base.rareza,
          stock: base.stock,
          limite_dia: base.limite_dia,
          solo_clan: base.solo_clan,
          activo: false,
        }
      : NUEVO
    const orden = Math.max(0, ...items.map((i) => i.orden)) + 1
    const { error } = await c.from('shop_items').insert({ ...fila, orden })
    setOcupado(null)
    avisar(error ? error.message : 'Premio creado (apagado) ✓')
    if (!error) onCambio()
  }

  const borrar = async (it: ItemTienda) => {
    // Un premio canjeado tiene historial colgando: borrarlo rompería la
    // trazabilidad de a quién se le debe qué. Por eso se avisa en serio.
    if (
      !confirm(
        `¿Borrar "${it.nombre}" para siempre?\n\n` +
          'Si alguien ya lo canjeó, es mejor APAGARLO (quitar el check de Activo): ' +
          'así desaparece de la tienda pero el historial de canjes sigue entero.'
      )
    ) {
      return
    }
    const c = sb()
    if (!c) return
    const { error } = await c.from('shop_items').delete().eq('id', it.id)
    avisar(
      error
        ? 'No se pudo borrar: probablemente tiene canjes asociados. Apágalo en su lugar.'
        : 'Borrado ✓'
    )
    if (!error) onCambio()
  }

  /** Intercambia el orden con el vecino: mover uno solo dejaría huecos. */
  const mover = async (it: ItemTienda, dir: -1 | 1) => {
    const orden = [...items].sort((a, b) => a.orden - b.orden)
    const i = orden.findIndex((x) => x.id === it.id)
    const j = i + dir
    if (j < 0 || j >= orden.length) return
    const c = sb()
    if (!c) return
    await Promise.all([
      c.from('shop_items').update({ orden: orden[j].orden }).eq('id', it.id),
      c.from('shop_items').update({ orden: it.orden }).eq('id', orden[j].id),
    ])
    onCambio()
  }

  const ordenados = [...items].sort((a, b) => a.orden - b.orden)

  return (
    <section className="card-glow p-6 mb-8">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="font-display font-bold text-xl">Tienda</h2>
          <p className="text-white/40 text-sm mt-0.5">
            El orden de arriba es el orden de la vitrina. Referencia: 1.000.000 coins = 100 USD.
          </p>
        </div>
        <button
          onClick={() => crear()}
          disabled={ocupado === 'nuevo'}
          className="btn-primary inline-flex items-center gap-2 min-h-[40px]"
        >
          <Plus className="w-4 h-4" /> Nuevo premio
        </button>
      </header>

      <div className="space-y-2">
        {ordenados.map((it, i) => (
          <article
            key={it.id}
            className={`rounded-xl border p-3 transition-colors ${
              it.activo
                ? 'border-white/10 bg-white/[0.02]'
                : // Lo apagado se ve apagado: si no, es fácil dejarse un premio
                  // invisible creyendo que está publicado.
                  'border-dashed border-white/10 bg-transparent opacity-60'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* Orden */}
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => mover(it, -1)}
                  disabled={i === 0}
                  className="text-white/30 hover:text-white disabled:opacity-20 leading-none"
                  aria-label="Subir"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => mover(it, 1)}
                  disabled={i === ordenados.length - 1}
                  className="text-white/30 hover:text-white disabled:opacity-20 leading-none"
                  aria-label="Bajar"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                className="input flex-1 min-w-[160px] font-display font-semibold"
                defaultValue={it.nombre}
                onBlur={(e) => guardar(it.id, 'nombre', e.target.value.trim())}
              />

              <label className="text-xs text-white/40">
                coins
                <input
                  className="input w-28 ml-1"
                  type="number"
                  defaultValue={it.precio_coins}
                  onBlur={(e) => guardar(it.id, 'precio_coins', +e.target.value)}
                />
              </label>

              <label className="text-xs text-white/40">
                💎
                <input
                  className="input w-24 ml-1"
                  type="number"
                  defaultValue={it.diamantes ?? ''}
                  placeholder="—"
                  onBlur={(e) =>
                    guardar(it.id, 'diamantes', e.target.value === '' ? null : +e.target.value)
                  }
                />
              </label>

              <label className="text-xs text-white/40">
                USD
                <input
                  className="input w-20 ml-1"
                  type="number"
                  step="0.01"
                  defaultValue={it.valor_usd ?? ''}
                  placeholder="—"
                  onBlur={(e) =>
                    guardar(it.id, 'valor_usd', e.target.value === '' ? null : +e.target.value)
                  }
                />
              </label>

              <select
                className="input w-32"
                defaultValue={it.rareza}
                onChange={(e) => guardar(it.id, 'rareza', e.target.value)}
              >
                {RAREZAS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 ml-auto shrink-0">
                <button
                  onClick={() => crear(it)}
                  className="p-2 rounded text-white/40 hover:text-white hover:bg-white/5"
                  title="Duplicar"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => borrar(it)}
                  className="p-2 rounded text-white/40 hover:text-elite-danger hover:bg-elite-danger/10"
                  title="Borrar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Segunda fila: lo que se toca menos */}
            <div className="flex flex-wrap items-center gap-3 mt-2 pl-6">
              <input
                className="input flex-1 min-w-[200px] text-xs"
                defaultValue={it.descripcion ?? ''}
                placeholder="Descripción que ve el jugador"
                onBlur={(e) => guardar(it.id, 'descripcion', e.target.value.trim())}
              />
              <label className="text-xs text-white/40" title="-1 = ilimitado">
                stock
                <input
                  className="input w-20 ml-1"
                  type="number"
                  defaultValue={it.stock}
                  onBlur={(e) => guardar(it.id, 'stock', +e.target.value)}
                />
              </label>
              <label className="text-xs text-white/40" title="0 = sin límite">
                /día
                <input
                  className="input w-16 ml-1"
                  type="number"
                  defaultValue={it.limite_dia}
                  onBlur={(e) => guardar(it.id, 'limite_dia', +e.target.value)}
                />
              </label>
              <label className="text-xs text-white/60 inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  defaultChecked={it.solo_clan}
                  onChange={(e) => guardar(it.id, 'solo_clan', e.target.checked)}
                />
                solo clan
              </label>
              <label
                className={`text-xs inline-flex items-center gap-1.5 font-display font-semibold ${
                  it.activo ? 'text-elite-success' : 'text-white/40'
                }`}
              >
                <input
                  type="checkbox"
                  defaultChecked={it.activo}
                  onChange={(e) => guardar(it.id, 'activo', e.target.checked)}
                />
                {it.activo ? (
                  <>
                    <Check className="w-3 h-3" /> visible
                  </>
                ) : (
                  'oculto'
                )}
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
