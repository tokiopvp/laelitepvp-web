'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'
import { Button } from '@/components/ui/button'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const empty = { title: '', slug: '', excerpt: '', content: '', cover_image_url: '', is_published: false }

function NoticiasAdmin() {
  const [rows, setRows] = useState<any[]>([])
  const [form, setForm] = useState<any>(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const sb = supabaseBrowser(); if (!sb) return
    const { data } = await sb.from('news').select('*').order('created_at', { ascending: false })
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    const sb = supabaseBrowser(); if (!sb) return
    const slug = form.slug || slugify(form.title)
    const payload = { ...form, slug, published_at: form.is_published ? new Date().toISOString() : null }
    if (editing) {
      const { error } = await sb.from('news').update(payload).eq('id', editing)
      if (error) { setMsg(error.message); return }
    } else {
      const { error } = await sb.from('news').insert(payload)
      if (error) { setMsg(error.message); return }
    }
    setForm(empty); setEditing(null); setMsg('Guardado ✓'); load()
  }
  const edit = (n: any) => { setForm(n); setEditing(n.id) }
  const del = async (id: string) => { const sb = supabaseBrowser(); if (!sb) return; await sb.from('news').delete().eq('id', id); load() }

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="Noticias" subtitle="Publicar anuncios del clan" />
      {msg && <p className="text-elite-primary mb-4">{msg}</p>}
      <div className="card-glow p-6 mb-8 space-y-3">
        <input className="input" placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="input" placeholder="Slug (auto si vacío)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input className="input" placeholder="Extracto" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        <textarea className="input min-h-[120px]" placeholder="Contenido" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <input className="input" placeholder="Cover URL" value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} />
        <label className="flex items-center gap-2 text-sm text-white/70"><input type="checkbox" checked={!!form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Publicado</label>
        <div className="flex gap-3">
          <Button onClick={save}>{editing ? 'Actualizar' : 'Publicar'} Noticia</Button>
          {editing && <Button variant="secondary" onClick={() => { setForm(empty); setEditing(null) }}>Cancelar</Button>}
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((n) => (
          <div key={n.id} className="card-glow p-4 flex items-center justify-between">
            <div>
              <p className="font-display font-bold">{n.title} <span className="text-white/40 text-sm">· {n.is_published ? '🟢 publicado' : '⚪ borrador'}</span></p>
              <p className="text-white/40 text-xs">{n.slug}</p>
            </div>
            <div className="flex gap-2">
              <button className="text-elite-primary text-sm" onClick={() => edit(n)}>Editar</button>
              <button className="text-red-400 text-sm" onClick={() => del(n.id)}>Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Page() {
  return <AdminGuard><NoticiasAdmin /></AdminGuard>
}
