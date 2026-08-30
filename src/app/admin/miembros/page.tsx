'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'
import { Member } from '@/lib/types'
import { Button } from '@/components/ui/button'

const ROLE_LABELS: Record<string, string> = {
  leader: '👑 Líder',
  interim_leader: '🔥 Interino',
  elder: '⭐ Decano',
  member: 'Miembro',
}

const empty = {
  nickname: '', free_fire_id: '', role_in_clan: 'member', rank: 'Diamond',
  level: 1, kd_ratio: 0, headshots: 0, wins: 0, booyahs: 0,
  avatar_url: '', outfit_image_url: '',
}

function MiembrosAdmin() {
  const [rows, setRows] = useState<Member[]>([])
  const [form, setForm] = useState<any>(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const sb = supabaseBrowser(); if (!sb) return
    const { data } = await sb.from('members').select('*').eq('is_active', true)
    // Orden: leader → interim → elder → kills
    const ROLE_ORDER: Record<string, number> = { leader: 0, interim_leader: 1, elder: 2, member: 3 }
    const sorted = [...((data as Member[]) || [])].sort((a, b) => {
      const ra = ROLE_ORDER[a.role_in_clan || 'member'] ?? 3
      const rb = ROLE_ORDER[b.role_in_clan || 'member'] ?? 3
      if (ra !== rb) return ra - rb
      return (b.kills ?? 0) - (a.kills ?? 0)
    })
    setRows(sorted)
  }, [])

  useEffect(() => { load() }, [load])

  // Realtime: se actualiza cuando alguien cambia un miembro
  useEffect(() => {
    const sb = supabaseBrowser(); if (!sb) return
    const ch = sb.channel('admin-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, load)
      .subscribe()
    return () => { ch.unsubscribe() }
  }, [load])

  const save = async () => {
    const sb = supabaseBrowser(); if (!sb) return
    if (editing) {
      const { error } = await sb.from('members').update({ ...form, kd_ratio: +form.kd_ratio, level: +form.level, headshots: +form.headshots, wins: +form.wins, booyahs: +form.booyahs }).eq('id', editing)
      if (error) { setMsg(error.message); return }
    } else {
      const { error } = await sb.from('members').insert({ ...form, kd_ratio: +form.kd_ratio, level: +form.level, headshots: +form.headshots, wins: +form.wins, booyahs: +form.booyahs })
      if (error) { setMsg(error.message); return }
    }
    setForm(empty); setEditing(null); setMsg('Guardado ✓'); load()
  }

  // Cambio rápido de rol desde la fila
  const quickRole = async (id: string, role: string) => {
    const sb = supabaseBrowser(); if (!sb) return
    const { error } = await sb.from('members').update({ role_in_clan: role }).eq('id', id)
    if (error) setMsg(error.message)
    else { setMsg('Rol actualizado ✓'); load() }
  }

  const edit = (m: Member) => { setForm(m); setEditing(m.id) }
  const del = async (id: string) => {
    const sb = supabaseBrowser(); if (!sb) return
    await sb.from('members').delete().eq('id', id); load()
  }

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="Miembros" subtitle="Gestionar squad oficial" />
      {msg && <p className="text-elite-primary mb-4">{msg}</p>}
      <div className="card-glow p-6 mb-8 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <input className="input" placeholder="Nickname" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
          <input className="input" placeholder="Free Fire ID" value={form.free_fire_id} onChange={(e) => setForm({ ...form, free_fire_id: e.target.value })} />
          <select className="input" value={form.role_in_clan} onChange={(e) => setForm({ ...form, role_in_clan: e.target.value })}>
            <option value="leader">👑 Líder</option>
            <option value="interim_leader">🔥 Líder Interino</option>
            <option value="elder">⭐ Decano</option>
            <option value="member">Miembro</option>
          </select>
          <select className="input" value={form.rank} onChange={(e) => setForm({ ...form, rank: e.target.value })}>
            {['Bronze','Silver','Gold','Platinum','Diamond','Master','Grandmaster'].map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className="input" type="number" placeholder="K/D" value={form.kd_ratio} onChange={(e) => setForm({ ...form, kd_ratio: e.target.value })} />
          <input className="input" type="number" placeholder="Nivel" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          <input className="input" type="number" placeholder="Headshots" value={form.headshots} onChange={(e) => setForm({ ...form, headshots: e.target.value })} />
          <input className="input" type="number" placeholder="Wins" value={form.wins} onChange={(e) => setForm({ ...form, wins: e.target.value })} />
          <input className="input" type="number" placeholder="Booyahs" value={form.booyahs} onChange={(e) => setForm({ ...form, booyahs: e.target.value })} />
          <input className="input" placeholder="Avatar URL" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
          <input className="input" placeholder="Outfit URL" value={form.outfit_image_url} onChange={(e) => setForm({ ...form, outfit_image_url: e.target.value })} />
        </div>
        <div className="flex gap-3">
          <Button onClick={save}>{editing ? 'Actualizar' : 'Añadir'} Miembro</Button>
          {editing && <Button variant="secondary" onClick={() => { setForm(empty); setEditing(null) }}>Cancelar</Button>}
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((m) => (
          <div key={m.id} className="card-glow p-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold truncate">{m.nickname} <span className="text-white/40 text-sm">· {m.rank} · K/D {m.kd_ratio}</span></p>
              <p className="text-white/40 text-xs">{m.wins}W · {m.booyahs} booyahs</p>
            </div>
            {/* Dropdown rápido de rol */}
            <select
              className="input w-36 text-sm"
              value={m.role_in_clan || 'member'}
              onChange={(e) => quickRole(m.id, e.target.value)}
            >
              <option value="leader">👑 Líder</option>
              <option value="interim_leader">🔥 Interino</option>
              <option value="elder">⭐ Decano</option>
              <option value="member">Miembro</option>
            </select>
            <div className="flex gap-2 shrink-0">
              <button className="text-elite-primary text-sm" onClick={() => edit(m)}>Editar</button>
              <button className="text-red-400 text-sm" onClick={() => del(m.id)}>Borrar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Page() {
  return <AdminGuard><MiembrosAdmin /></AdminGuard>
}
