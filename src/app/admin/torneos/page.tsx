'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'
import { Tournament, GameMode } from '@/lib/types'
import { Button } from '@/components/ui/button'

const empty = {
  name: '', game_mode: 'Squad', prize: '', placement: 1,
  date_played: '', screenshot_url: '', replay_url: '', participants_count: 0,
}

function TorneosAdmin() {
  const [rows, setRows] = useState<Tournament[]>([])
  const [form, setForm] = useState<any>(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const sb = supabaseBrowser(); if (!sb) return
    const { data } = await sb.from('tournaments').select('*').order('date_played', { ascending: false })
    setRows((data as Tournament[]) || [])
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    const sb = supabaseBrowser(); if (!sb) return
    const payload = { ...form, placement: +form.placement, participants_count: +form.participants_count }
    if (editing) {
      const { error } = await sb.from('tournaments').update(payload).eq('id', editing)
      if (error) { setMsg(error.message); return }
    } else {
      const { error } = await sb.from('tournaments').insert(payload)
      if (error) { setMsg(error.message); return }
    }
    setForm(empty); setEditing(null); setMsg('Guardado ✓'); load()
  }
  const edit = (t: Tournament) => { setForm(t); setEditing(t.id) }
  const del = async (id: string) => { const sb = supabaseBrowser(); if (!sb) return; await sb.from('tournaments').delete().eq('id', id); load() }

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="Torneos" subtitle="Añadir victorias del clan" />
      {msg && <p className="text-elite-primary mb-4">{msg}</p>}
      <div className="card-glow p-6 mb-8 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <input className="input" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" value={form.game_mode} onChange={(e) => setForm({ ...form, game_mode: e.target.value })}>
            {(['Solo','Duo','Squad','Clash Squad'] as GameMode[]).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input className="input" placeholder="Premio" value={form.prize} onChange={(e) => setForm({ ...form, prize: e.target.value })} />
          <input className="input" type="number" placeholder="Posición" value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} />
          <input className="input" type="date" value={form.date_played} onChange={(e) => setForm({ ...form, date_played: e.target.value })} />
          <input className="input" type="number" placeholder="Participantes" value={form.participants_count} onChange={(e) => setForm({ ...form, participants_count: e.target.value })} />
          <input className="input" placeholder="Screenshot URL" value={form.screenshot_url} onChange={(e) => setForm({ ...form, screenshot_url: e.target.value })} />
          <input className="input" placeholder="Replay URL" value={form.replay_url} onChange={(e) => setForm({ ...form, replay_url: e.target.value })} />
        </div>
        <div className="flex gap-3">
          <Button onClick={save}>{editing ? 'Actualizar' : 'Añadir'} Torneo</Button>
          {editing && <Button variant="secondary" onClick={() => { setForm(empty); setEditing(null) }}>Cancelar</Button>}
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((t) => (
          <div key={t.id} className="card-glow p-4 flex items-center justify-between">
            <div>
              <p className="font-display font-bold">{t.name} <span className="text-white/40 text-sm">· {t.game_mode}</span></p>
              <p className="text-white/40 text-xs">{t.prize} · {t.placement === 1 ? '🏆 Campeón' : `#${t.placement}`}</p>
            </div>
            <div className="flex gap-2">
              <button className="text-elite-primary text-sm" onClick={() => edit(t)}>Editar</button>
              <button className="text-red-400 text-sm" onClick={() => del(t.id)}>Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Page() {
  return <AdminGuard><TorneosAdmin /></AdminGuard>
}
