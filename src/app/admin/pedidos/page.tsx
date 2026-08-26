'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'
import { formatUSD } from '@/lib/utils'
import { getActivityLogs } from '@/lib/data'

const STATUSES = ['pending', 'paid', 'processing', 'delivered', 'cancelled']
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', paid: 'Pagado', processing: 'Procesando',
  delivered: 'Entregado', cancelled: 'Cancelado',
}
const ACTION_LABEL: Record<string, string> = {
  store_view: 'Entró a la tienda', add_cart: 'Agregó al carrito', purchase: 'Compra',
}

function PedidosAdmin() {
  const [rows, setRows] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const load = async () => {
    const sb = supabaseBrowser(); if (!sb) return
    const { data } = await sb.from('orders').select('*').order('created_at', { ascending: false })
    setRows(data || [])
    setActivity(await getActivityLogs(60))
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

  const totalVentas = rows.filter(r => r.status !== 'cancelled').reduce((s, r) => s + (r.total_usd || 0), 0)
  const pendientes = rows.filter(r => r.status === 'pending').length
  const ingresos = rows.filter(r => r.status === 'paid' || r.status === 'delivered').reduce((s, r) => s + (r.total_usd || 0), 0)

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="Ventas PagoStore" subtitle="Pedidos y actividad de usuarios en tiempo real" />

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4">
          <p className="text-white/50 text-sm">Ingresos (pagado+entregado)</p>
          <p className="font-display font-bold text-2xl gradient-text">{formatUSD(ingresos)}</p>
        </div>
        <div className="card p-4">
          <p className="text-white/50 text-sm">Total histórico</p>
          <p className="font-display font-bold text-2xl gradient-text">{formatUSD(totalVentas)}</p>
        </div>
        <div className="card p-4">
          <p className="text-white/50 text-sm">Pendientes</p>
          <p className="font-display font-bold text-2xl text-yellow-400">{pendientes}</p>
        </div>
      </div>

      {msg && <p className="text-elite-primary mb-4">{msg}</p>}

      <h2 className="font-display font-bold text-xl mb-3">Pedidos</h2>
      <div className="space-y-2 mb-10">
        {rows.length === 0 && <p className="text-white/40">No hay pedidos todavía.</p>}
        {rows.map((o) => (
          <div key={o.id} className="card-glow p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-display font-bold">{o.customer_name} <span className={`text-sm ${color(o.status)}`}>· {STATUS_LABEL[o.status] || o.status}</span></p>
              <p className="text-white/40 text-xs">{o.order_number} · {formatUSD(o.total_usd)} · {o.payment_method || '—'} · FF:{o.free_fire_id} · {o.customer_discord || ''}</p>
            </div>
            <select className="input w-auto" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>)}
            </select>
          </div>
        ))}
      </div>

      <h2 className="font-display font-bold text-xl mb-3">Actividad de usuarios</h2>
      <div className="space-y-2">
        {activity.length === 0 && <p className="text-white/40">Sin actividad registrada.</p>}
        {activity.map((a) => (
          <div key={a.id} className="card-glow p-3 flex items-center justify-between gap-3 text-sm">
            <div>
              <span className={`font-bold ${a.action === 'purchase' ? 'text-elite-gold' : 'text-elite-primary'}`}>
                {ACTION_LABEL[a.action] || a.action}
              </span>
              {a.metadata?.customer && <span className="text-white/60"> · {a.metadata.customer} (FF:{a.metadata.ffid})</span>}
              {a.metadata?.product && <span className="text-white/60"> · {a.metadata.product}</span>}
              {a.metadata?.total && <span className="text-white/60"> · {formatUSD(a.metadata.total)}</span>}
            </div>
            <span className="text-white/30 text-xs">{new Date(a.created_at).toLocaleString('es')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Page() {
  return <AdminGuard><PedidosAdmin /></AdminGuard>
}
