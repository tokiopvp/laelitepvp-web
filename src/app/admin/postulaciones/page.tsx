'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'

function PostulacionesAdmin() {
  const [rows, setRows] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const load = async () => {
    const sb = supabaseBrowser(); if (!sb) return
    const { data } = await sb.from('applications').select('*').order('created_at', { ascending: false })
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  const setStatus = async (id: string, status: string) => {
    const sb = supabaseBrowser(); if (!sb) return
    const { error } = await sb.from('applications').update({ status }).eq('id', id)
    if (error) { setMsg(error.message); return }
    setMsg('Actualizado ✓'); load()
  }

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="Postulaciones" subtitle="Solicitudes para unirse al clan" />
      {msg && <p className="text-elite-primary mb-4">{msg}</p>}
      <div className="space-y-3">
        {rows.length === 0 && <p className="text-white/40">No hay postulaciones todavía.</p>}
        {rows.map((a) => (
          <div key={a.id} className="card-glow p-5">
            <div className="flex justify-between flex-wrap gap-2 mb-2">
              <p className="font-display font-bold text-lg">{a.nickname} <span className="text-white/40 text-sm">· FF:{a.free_fire_id}</span></p>
              <span className={`text-sm ${a.status === 'approved' ? 'text-elite-gold' : a.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>{a.status}</span>
            </div>
            <p className="text-white/60 text-sm mb-1">Rango: {a.rank || '—'} · Edad: {a.age || '—'} · Discord: {a.discord || '—'}</p>
            <p className="text-white/50 text-sm mb-3">{a.experience || ''}</p>
            <div className="flex gap-2">
              <button className="text-elite-gold text-sm" onClick={() => setStatus(a.id, 'approved')}>Aprobar</button>
              <button className="text-red-400 text-sm" onClick={() => setStatus(a.id, 'rejected')}>Rechazar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Page() {
  return <AdminGuard><PostulacionesAdmin /></AdminGuard>
}
