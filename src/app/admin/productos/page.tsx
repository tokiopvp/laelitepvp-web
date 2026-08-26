'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'
import { Product, ProductCategory } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { formatUSD } from '@/lib/utils'

const empty = {
  name: '', category: 'diamonds', diamonds_amount: 0, price_usd: 0,
  discount_percent: 0, stock: -1, image_url: '', description: '',
  is_featured: false, is_active: true,
}

function ProductosAdmin() {
  const [rows, setRows] = useState<Product[]>([])
  const [form, setForm] = useState<any>(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const sb = supabaseBrowser(); if (!sb) return
    const { data } = await sb.from('products').select('*').order('category')
    setRows((data as Product[]) || [])
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    const sb = supabaseBrowser(); if (!sb) return
    const payload = { ...form, diamonds_amount: +form.diamonds_amount, price_usd: +form.price_usd, discount_percent: +form.discount_percent, stock: +form.stock }
    if (editing) {
      const { error } = await sb.from('products').update(payload).eq('id', editing)
      if (error) { setMsg(error.message); return }
    } else {
      const { error } = await sb.from('products').insert(payload)
      if (error) { setMsg(error.message); return }
    }
    setForm(empty); setEditing(null); setMsg('Guardado ✓'); load()
  }
  const edit = (p: Product) => { setForm(p); setEditing(p.id) }
  const del = async (id: string) => { const sb = supabaseBrowser(); if (!sb) return; await sb.from('products').delete().eq('id', id); load() }

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="PagoStore" subtitle="Catálogo de diamantes y más" />
      {msg && <p className="text-elite-primary mb-4">{msg}</p>}
      <div className="card-glow p-6 mb-8 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <input className="input" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {(['diamonds','membership','bundle','pass'] as ProductCategory[]).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="input" type="number" placeholder="Diamantes" value={form.diamonds_amount} onChange={(e) => setForm({ ...form, diamonds_amount: e.target.value })} />
          <input className="input" type="number" step="0.01" placeholder="Precio USD" value={form.price_usd} onChange={(e) => setForm({ ...form, price_usd: e.target.value })} />
          <input className="input" type="number" placeholder="% Desc" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
          <input className="input" type="number" placeholder="Stock (-1=inf)" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          <input className="input" placeholder="Imagen URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          <input className="input" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={!!form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> Destacado</label>
          <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Activo</label>
        </div>
        <div className="flex gap-3">
          <Button onClick={save}>{editing ? 'Actualizar' : 'Añadir'} Producto</Button>
          {editing && <Button variant="secondary" onClick={() => { setForm(empty); setEditing(null) }}>Cancelar</Button>}
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((p) => (
          <div key={p.id} className="card-glow p-4 flex items-center justify-between">
            <div>
              <p className="font-display font-bold">{p.name} <span className="text-white/40 text-sm">· {p.category}{p.diamonds_amount ? ` · ${p.diamonds_amount}💎` : ''}</span></p>
              <p className="text-white/40 text-xs">{formatUSD(p.price_usd)}{p.discount_percent ? ` (-${p.discount_percent}%)` : ''}</p>
            </div>
            <div className="flex gap-2">
              <button className="text-elite-primary text-sm" onClick={() => edit(p)}>Editar</button>
              <button className="text-red-400 text-sm" onClick={() => del(p.id)}>Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Page() {
  return <AdminGuard><ProductosAdmin /></AdminGuard>
}
