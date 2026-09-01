'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'
import { Product, ProductCategory } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { formatUSD } from '@/lib/utils'
import { Plus, X } from 'lucide-react'

/**
 * Catalogo de la tienda, editable en la fila.
 *
 * POR QUE EN LINEA Y NO CON UN FORMULARIO
 * ---------------------------------------
 * El flujo real del panel es entrar a tocar UN precio porque cambio la tasa,
 * activar un pack que estaba apagado o subirle el descuento a algo que no se
 * mueve. Con el formulario unico eso eran cinco pasos: encontrar el producto,
 * pulsar editar, bajar al formulario, cambiar, guardar. En la tabla es uno:
 * tocar la celda y escribir.
 *
 * El formulario completo queda solo para CREAR productos y para los campos
 * raros (precios por pais, imagen, descripcion), abajo, colapsado.
 */

const VACIO = {
  name: '', category: 'diamonds', diamonds_amount: 0, coins_entrega: 0, price_usd: 0,
  discount_percent: 0, stock: -1, image_url: '', description: '',
  is_featured: false, is_active: true, precios_locales: {},
}

const CATEGORIA_COLOR: Record<string, string> = {
  diamonds: 'text-sky-400',
  bundle: 'text-elite-gold',
  membership: 'text-elite-primary',
  pass: 'text-elite-secondary',
}

const CATEGORIA_LABEL: Record<string, string> = {
  diamonds: '💎 Diamantes',
  bundle: '🪙 Coins',
  membership: 'Membresía',
  pass: 'Pase',
}

function ProductosAdmin() {
  const [rows, setRows] = useState<Product[]>([])
  const [form, setForm] = useState<any>(VACIO)
  const [editing, setEditing] = useState<string | null>(null)
  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const sb = supabaseBrowser(); if (!sb) return
    const { data } = await sb.from('products').select('*').order('category').order('price_usd')
    setRows((data as Product[]) || [])
  }
  useEffect(() => { load() }, [])

  // El aviso no se queda pegado en pantalla para siempre.
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 3000)
    return () => clearTimeout(t)
  }, [msg])

  /** Guardado en linea: se escribe la celda al salir del campo. */
  const guardar = async (p: Product, campo: string, valor: any) => {
    const sb = supabaseBrowser(); if (!sb) return
    const { error } = await sb.from('products').update({ [campo]: valor }).eq('id', p.id)
    setMsg(error ? error.message : 'Guardado ✓')
    if (!error) setRows((rs) => rs.map((x) => (x.id === p.id ? { ...x, [campo]: valor } : x)))
  }

  const save = async () => {
    const sb = supabaseBrowser(); if (!sb) return
    // El campo se edita como texto para poder escribirlo a mano; aqui se
    // convierte. Si el JSON esta mal se avisa en vez de guardar basura que
    // dejaria la tienda sin precios en ese pais.
    let precios: Record<string, number> = {}
    if (typeof form.precios_locales === 'string') {
      const t = form.precios_locales.trim()
      if (t) {
        try {
          precios = JSON.parse(t)
        } catch {
          setMsg('El precio por país no es válido. Ejemplo: {"PE": 30}')
          return
        }
      }
    } else {
      precios = form.precios_locales ?? {}
    }
    const payload = {
      ...form,
      diamonds_amount: +form.diamonds_amount || null,
      coins_entrega: +form.coins_entrega || null,
      price_usd: +form.price_usd,
      discount_percent: +form.discount_percent,
      stock: +form.stock,
      precios_locales: precios,
    }
    if (editing) {
      const { error } = await sb.from('products').update(payload).eq('id', editing)
      if (error) { setMsg(error.message); return }
    } else {
      const { error } = await sb.from('products').insert(payload)
      if (error) { setMsg(error.message); return }
    }
    setForm(VACIO); setEditing(null); setNuevoAbierto(false); setMsg('Guardado ✓'); load()
  }
  const edit = (p: Product) => { setForm(p); setEditing(p.id); setNuevoAbierto(true) }
  const del = async (id: string) => {
    const sb = supabaseBrowser(); if (!sb) return
    if (!confirm('¿Borrar este producto?')) return
    await sb.from('products').delete().eq('id', id); load()
  }

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="Tienda" subtitle="Diamantes, packs de coins y más" />

      {/* Aviso flotante, como en economia: con la tabla larga, un mensaje al
          principio de la pagina queda fuera de pantalla al tocar una fila. */}
      {msg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 ff-cut-sm
                        border border-elite-primary/50 bg-elite-dark/95 text-elite-primary
                        font-display shadow-lg shadow-black/60 animate-slide-up">
          {msg}
        </div>
      )}

      {/* Boton de crear: el formulario completo queda plegado para no empujar
          la tabla hacia abajo cuando no se usa. */}
      <div className="mb-4">
        <button
          onClick={() => setNuevoAbierto((v) => !v)}
          className="btn-primary text-sm inline-flex items-center gap-2"
        >
          {nuevoAbierto ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {nuevoAbierto ? 'Cerrar formulario' : 'Nuevo producto'}
        </button>
      </div>

      {nuevoAbierto && (
        <div className="card-glow p-6 mb-8 space-y-3">
          <p className="font-display font-bold text-lg">
            {editing ? 'Editar producto' : 'Nuevo producto'}
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <input className="input" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {(['diamonds', 'bundle', 'membership', 'pass'] as ProductCategory[]).map((c) => (
                <option key={c} value={c}>{CATEGORIA_LABEL[c] ?? c}</option>
              ))}
            </select>
            <input className="input" type="number" placeholder="Diamantes" value={form.diamonds_amount ?? ''} onChange={(e) => setForm({ ...form, diamonds_amount: e.target.value })} />
            <input className="input" type="number" placeholder="🪙 Coins que entrega (0 = no es pack)" value={form.coins_entrega ?? ''} onChange={(e) => setForm({ ...form, coins_entrega: e.target.value })} />
            <input className="input" type="number" step="0.01" placeholder="Precio USD" value={form.price_usd} onChange={(e) => setForm({ ...form, price_usd: e.target.value })} />
            <input className="input" type="number" placeholder="% Desc" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
            <input className="input" type="number" placeholder="Stock (-1=inf)" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            <input className="input" placeholder="Imagen URL" value={form.image_url ?? ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
            <input className="input" placeholder="Descripción" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {/* Precio cerrado por pais. Manda sobre la conversion por tasa: en
                algunos mercados el precio que aguanta la competencia no es el que
                sale de multiplicar por el dolar, y ademas asi el importe no baila
                cada vez que se mueve el tipo de cambio. */}
            <input
              className="input sm:col-span-3"
              placeholder='Precio fijo por pais, ej: {"PE": 30, "CO": 40000} — vacio = se calcula con la tasa'
              value={typeof form.precios_locales === 'string'
                ? form.precios_locales
                : JSON.stringify(form.precios_locales ?? {})}
              onChange={(e) => setForm({ ...form, precios_locales: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={!!form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Destacado</label>
            <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Activo</label>
          </div>
          <div className="flex gap-3">
            <Button onClick={save}>{editing ? 'Actualizar' : 'Añadir'} Producto</Button>
            {editing && <Button variant="secondary" onClick={() => { setForm(VACIO); setEditing(null); setNuevoAbierto(false) }}>Cancelar</Button>}
          </div>
        </div>
      )}

      {/* La tabla: cada celda editable en el sitio. */}
      <section className="card-glow p-6 overflow-x-auto">
        <h2 className="font-display font-bold text-xl mb-1">Catálogo</h2>
        <p className="text-white/40 text-sm mb-5">
          Toca un campo, escribe, sal: se guarda solo. 🪙 = pack de Elite Coins.
        </p>
        <table className="w-full text-sm min-w-[960px]">
          <thead className="text-white/40 text-xs font-display">
            <tr className="text-left">
              <th className="pb-2">Producto</th>
              <th className="pb-2 w-32">Categoría</th>
              <th className="pb-2 w-24">USD</th>
              <th className="pb-2 w-24">💎</th>
              <th className="pb-2 w-28">🪙 Coins</th>
              <th className="pb-2 w-16">%Desc</th>
              <th className="pb-2 w-20">Stock</th>
              <th className="pb-2 w-14">Top</th>
              <th className="pb-2 w-16">Activo</th>
              <th className="pb-2 w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {rows.map((p) => (
              <tr key={p.id} className={p.is_active ? '' : 'opacity-40'}>
                <td className="py-2 pr-3">
                  <input
                    className={`input w-full font-display font-semibold ${CATEGORIA_COLOR[p.category] ?? ''}`}
                    defaultValue={p.name}
                    onBlur={(e) => e.target.value.trim() !== p.name && guardar(p, 'name', e.target.value.trim())}
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    className="input w-full"
                    value={p.category}
                    onChange={(e) => guardar(p, 'category', e.target.value)}
                  >
                    {(['diamonds', 'bundle', 'membership', 'pass'] as ProductCategory[]).map((c) => (
                      <option key={c} value={c}>{CATEGORIA_LABEL[c] ?? c}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input className="input w-full" type="number" step="0.01" defaultValue={p.price_usd}
                    onBlur={(e) => guardar(p, 'price_usd', +e.target.value)} />
                </td>
                <td className="py-2 pr-2">
                  <input className="input w-full" type="number" defaultValue={p.diamonds_amount ?? ''} placeholder="—"
                    onBlur={(e) => guardar(p, 'diamonds_amount', e.target.value ? +e.target.value : null)} />
                </td>
                <td className="py-2 pr-2">
                  <input className={`input w-full ${p.coins_entrega ? 'text-elite-gold font-semibold' : ''}`} type="number" defaultValue={p.coins_entrega ?? ''} placeholder="—"
                    onBlur={(e) => guardar(p, 'coins_entrega', e.target.value ? +e.target.value : null)} />
                </td>
                <td className="py-2 pr-2">
                  <input className="input w-full" type="number" defaultValue={p.discount_percent}
                    onBlur={(e) => guardar(p, 'discount_percent', +e.target.value)} />
                </td>
                <td className="py-2 pr-2">
                  <input className="input w-full" type="number" defaultValue={p.stock}
                    onBlur={(e) => guardar(p, 'stock', +e.target.value)} />
                </td>
                <td className="py-2 text-center">
                  <input type="checkbox" checked={!!p.is_featured}
                    onChange={(e) => guardar(p, 'is_featured', e.target.checked)} />
                </td>
                <td className="py-2 text-center">
                  <input type="checkbox" checked={!!p.is_active}
                    onChange={(e) => guardar(p, 'is_active', e.target.checked)} />
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  <button className="text-elite-primary text-xs px-2 hover:underline" onClick={() => edit(p)} title="Editar todo (país, imagen, descripción)">
                    Avanzado
                  </button>
                  <button className="text-red-400 text-xs px-2 hover:underline" onClick={() => del(p.id)}>
                    Borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-white/30 text-sm py-6 text-center">Sin productos todavía. Crea el primero arriba.</p>
        )}
      </section>
    </div>
  )
}

export default function Page() {
  return <AdminGuard><ProductosAdmin /></AdminGuard>
}
