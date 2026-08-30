'use client'

import { useState } from 'react'
import { Plus, Copy, Trash2, ArrowUp, ArrowDown, Check, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'
import type { ItemTienda, Rareza } from '@/lib/economia'

/**
 * Gestión de la tienda de Elite Coin.
 *
 * Panel práctico: formulario rápido arriba, lista compacta abajo con
 * acciones inline. Cada item se puede expandir para editar detalles
 * sin navegar a otra pantalla.
 */

const RAREZAS: Rareza[] = ['basura', 'normal', 'epico', 'legendario']
const RAREZA_LABELS: Record<Rareza, string> = {
  basura: '🗑️ Basura',
  normal: '🎁 Normal',
  epico: '⚡ Épico',
  legendario: '👑 Legendario',
}

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
  activo: false,
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
  const [expandido, setExpandido] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const [formNuevo, setFormNuevo] = useState(NUEVO)

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
      : formNuevo
    const orden = Math.max(0, ...items.map((i) => i.orden)) + 1
    const { error } = await c.from('shop_items').insert({ ...fila, orden })
    setOcupado(null)
    if (!error) {
      setNuevo(false)
      setFormNuevo(NUEVO)
      avisar('Premio creado (apagado) ✓')
      onCambio()
    } else {
      avisar(error.message)
    }
  }

  const borrar = async (it: ItemTienda) => {
    if (
      !confirm(
        `¿Borrar "${it.nombre}"?\n\nSi ya tiene canjes, mejor APAGARLO (quitar Activo).`
      )
    ) return
    const c = sb()
    if (!c) return
    const { error } = await c.from('shop_items').delete().eq('id', it.id)
    avisar(error ? 'No se pudo borrar.' : 'Borrado ✓')
    if (!error) onCambio()
  }

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
    <section className="card-glow p-4 sm:p-6 mb-8">
      <header className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display font-bold text-xl">Tienda Elite</h2>
          <p className="text-white/40 text-xs mt-0.5">
            {items.length} premios · 1M coins ≈ 100 USD
          </p>
        </div>
        <button
          onClick={() => setNuevo(!nuevo)}
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </header>

      {/* Formulario rápido de nuevo premio */}
      {nuevo && (
        <div className="rounded-xl border border-elite-primary/30 bg-elite-primary/5 p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input
              className="input col-span-2"
              placeholder="Nombre del premio"
              value={formNuevo.nombre}
              onChange={(e) => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
            />
            <input
              className="input"
              type="number"
              placeholder="Precio coins"
              value={formNuevo.precio_coins}
              onChange={(e) => setFormNuevo({ ...formNuevo, precio_coins: +e.target.value })}
            />
            <select
              className="input"
              value={formNuevo.rareza}
              onChange={(e) => setFormNuevo({ ...formNuevo, rareza: e.target.value as Rareza })}
            >
              {RAREZAS.map((r) => (
                <option key={r} value={r}>{RAREZA_LABELS[r]}</option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              placeholder="Diamantes 💎"
              value={formNuevo.diamantes ?? ''}
              onChange={(e) => setFormNuevo({ ...formNuevo, diamantes: e.target.value ? +e.target.value : null })}
            />
            <input
              className="input"
              type="number"
              step="0.01"
              placeholder="Valor USD"
              value={formNuevo.valor_usd ?? ''}
              onChange={(e) => setFormNuevo({ ...formNuevo, valor_usd: e.target.value ? +e.target.value : null })}
            />
            <input
              className="input"
              placeholder="Descripción"
              value={formNuevo.descripcion}
              onChange={(e) => setFormNuevo({ ...formNuevo, descripcion: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => crear()}
              disabled={ocupado === 'nuevo'}
              className="btn-primary text-sm"
            >
              {ocupado === 'nuevo' ? 'Creando…' : 'Crear premio'}
            </button>
            <button
              onClick={() => { setNuevo(false); setFormNuevo(NUEVO) }}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-white/50 text-sm hover:bg-white/5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista compacta */}
      <div className="space-y-1.5">
        {ordenados.map((it, i) => {
          const expandir = expandido === it.id
          return (
            <div
              key={it.id}
              className={`rounded-xl border transition-colors ${
                it.activo
                  ? 'border-white/10 bg-white/[0.02]'
                  : 'border-dashed border-white/10 bg-transparent opacity-50'
              }`}
            >
              {/* Fila principal compacta */}
              <div className="flex items-center gap-2 px-3 py-2">
                {/* Flechas */}
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => mover(it, -1)}
                    disabled={i === 0}
                    className="text-white/20 hover:text-white disabled:opacity-20 leading-none p-0.5"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => mover(it, 1)}
                    disabled={i === ordenados.length - 1}
                    className="text-white/20 hover:text-white disabled:opacity-20 leading-none p-0.5"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Nombre + rareza */}
                <button
                  onClick={() => setExpandido(expandir ? null : it.id)}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left"
                >
                  <span className="text-sm">{RAREZA_LABELS[it.rareza].split(' ')[0]}</span>
                  <span className="font-display font-semibold text-sm truncate">{it.nombre}</span>
                  <span className="text-white/30 text-xs font-mono">
                    {it.precio_coins.toLocaleString('es')} coins
                  </span>
                  {it.diamantes && (
                    <span className="text-elite-live text-xs font-mono">💎{it.diamantes}</span>
                  )}
                  {expandir ? (
                    <ChevronUp className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
                  )}
                </button>

                {/* Toggle rápido */}
                <button
                  onClick={() => guardar(it.id, 'activo', !it.activo)}
                  className={`p-1.5 rounded transition-colors ${
                    it.activo
                      ? 'text-elite-success bg-elite-success/10'
                      : 'text-white/30 hover:text-white'
                  }`}
                  title={it.activo ? 'Ocultar' : 'Mostrar'}
                >
                  {it.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                {/* Duplicar + borrar */}
                <button
                  onClick={() => crear(it)}
                  className="p-1.5 rounded text-white/30 hover:text-white hover:bg-white/5"
                  title="Duplicar"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => borrar(it)}
                  className="p-1.5 rounded text-white/30 hover:text-elite-danger hover:bg-elite-danger/10"
                  title="Borrar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Panel expandido: detalles */}
              {expandir && (
                <div className="px-3 pb-3 pt-1 border-t border-white/[0.04] grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="text-xs text-white/40">
                    Nombre
                    <input
                      className="input w-full mt-1 text-sm"
                      defaultValue={it.nombre}
                      onBlur={(e) => guardar(it.id, 'nombre', e.target.value.trim())}
                    />
                  </label>
                  <label className="text-xs text-white/40">
                    Coins
                    <input
                      className="input w-full mt-1"
                      type="number"
                      defaultValue={it.precio_coins}
                      onBlur={(e) => guardar(it.id, 'precio_coins', +e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-white/40">
                    💎 Diamantes
                    <input
                      className="input w-full mt-1"
                      type="number"
                      defaultValue={it.diamantes ?? ''}
                      placeholder="—"
                      onBlur={(e) => guardar(it.id, 'diamantes', e.target.value === '' ? null : +e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-white/40">
                    USD
                    <input
                      className="input w-full mt-1"
                      type="number"
                      step="0.01"
                      defaultValue={it.valor_usd ?? ''}
                      placeholder="—"
                      onBlur={(e) => guardar(it.id, 'valor_usd', e.target.value === '' ? null : +e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-white/40">
                    Descripción
                    <input
                      className="input w-full mt-1 text-xs"
                      defaultValue={it.descripcion ?? ''}
                      placeholder="Visible para el jugador"
                      onBlur={(e) => guardar(it.id, 'descripcion', e.target.value.trim())}
                    />
                  </label>
                  <label className="text-xs text-white/40">
                    Rareza
                    <select
                      className="input w-full mt-1"
                      defaultValue={it.rareza}
                      onChange={(e) => guardar(it.id, 'rareza', e.target.value)}
                    >
                      {RAREZAS.map((r) => (
                        <option key={r} value={r}>{RAREZA_LABELS[r]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-white/40">
                    Stock (-1=inf)
                    <input
                      className="input w-full mt-1"
                      type="number"
                      defaultValue={it.stock}
                      onBlur={(e) => guardar(it.id, 'stock', +e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-white/40">
                    /día (0=inf)
                    <input
                      className="input w-full mt-1"
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
                    Solo clan
                  </label>
                </div>
              )}
            </div>
          )
        })}

        {ordenados.length === 0 && (
          <p className="text-center text-white/30 text-sm py-8">
            No hay premios. Crea uno con el botón "Nuevo".
          </p>
        )}
      </div>
    </section>
  )
}
