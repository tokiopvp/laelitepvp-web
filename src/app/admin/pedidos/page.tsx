'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'
import { formatUSD } from '@/lib/utils'

const STATUSES = ['pending', 'paid', 'processing', 'delivered', 'cancelled']

function PedidosAdmin() {
  const [rows, setRows] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const load = async () => {
    const sb = supabaseBrowser(); if (!sb) return
    const { data } = await sb.from('orders').select('*').order('created_at', { ascending: false })
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  const setStatus = async (id: string, status: string) => {
    const sb = supabaseBrowser(); if (!sb) return
    const { error } = await sb.from('orders').update({ status }).eq('id', id)
    if (error) { setMsg(error.message); return }
    setMsg('Actualizado ✓'); load()
  }

  const color = (s: string) => ({
    pending: 'text-yellow-400', paid: 'text-elite-primary', processing: 'text-elite-secondary',
    delivered: 'text-elite-gold', cancelled: 'text-red-400',
  }[s] || 'text-white')

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="Pedidos" subtitle="Estado de ventas PagoStore" />
      {msg && <p className="text-elite-primary mb-4">{msg}</p>}
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-white/40">No hay pedidos todavía.</p>}
        {rows.map((o) => (
          <div key={o.id} className="card-glow p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-display font-bold">{o.customer_name} <span className={`text-sm ${color(o.status)}`}>· {o.status}</span></p>
              <p className="text-white/40 text-xs">{o.order_number} · {formatUSD(o.total_usd)} · {o.customer_discord || o.customer_email || ''} · FF:{o.free_fire_id}</p>
            </div>
            <select className="input w-auto" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Page() {
  return <AdminGuard><PedidosAdmin /></AdminGuard>
}
