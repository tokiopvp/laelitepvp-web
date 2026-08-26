'use client'

import { useEffect, useState } from 'react'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'
import {
  getAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getSetting,
  setSetting,
} from '@/lib/data'
import type { PaymentMethod } from '@/lib/types'
import { Plus, Trash2, Save, Phone } from 'lucide-react'

function PagosAdmin() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [whatsapp, setWhatsapp] = useState('')
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('💳')
  const [newCountry, setNewCountry] = useState('ALL')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    getAllPaymentMethods().then(setMethods)
    getSetting('whatsapp_number').then((v) => setWhatsapp(v ?? ''))
  }
  useEffect(() => { load() }, [])

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 3000)
  }

  const add = async () => {
    if (!newName.trim()) return
    const { error } = await createPaymentMethod({
      name: newName.trim(),
      icon: newIcon.trim(),
      country: newCountry,
      position: methods.length + 1,
    })
    if (error) return flash('Error: ' + error)
    setNewName(''); setNewIcon('💳'); setNewCountry('ALL')
    flash('Método agregado')
    load()
  }

  const toggle = async (m: PaymentMethod) => {
    await updatePaymentMethod(m.id, { enabled: !m.enabled })
    load()
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este método?')) return
    await deletePaymentMethod(id)
    load()
  }

  const saveWa = async () => {
    setSaving(true)
    const { error } = await setSetting('whatsapp_number', whatsapp.trim())
    setSaving(false)
    flash(error ? 'Error: ' + error : 'WhatsApp guardado')
  }

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="Pagos & Soporte" subtitle="Métodos de pago visibles en la tienda y canal de WhatsApp" />

      <div className="card-glow p-6 mb-8">
        <h2 className="font-display font-bold text-xl mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-elite-primary" /> Número de WhatsApp (soporte)
        </h2>
        <p className="text-white/50 text-sm mb-3">Formato internacional, ej: 584121234567</p>
        <div className="flex gap-3 flex-wrap">
          <input
            className="input flex-1 min-w-[200px]"
            placeholder="584121234567"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
          <button onClick={saveWa} disabled={saving} className="btn-primary justify-center">
            <Save className="w-4 h-4" /> Guardar
          </button>
        </div>
      </div>

      <div className="card-glow p-6">
        <h2 className="font-display font-bold text-xl mb-4">Métodos de pago</h2>

        <div className="space-y-3 mb-6">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center gap-3 bg-elite-dark/40 rounded-lg p-3">
              <span className="text-xl w-8 text-center">{m.icon}</span>
              <div className="flex-1">
                <p className="font-medium">{m.name}</p>
                <p className="text-white/40 text-xs">País: {m.country}</p>
              </div>
              <button
                onClick={() => toggle(m)}
                className={m.enabled ? 'btn-secondary text-xs' : 'btn-primary text-xs'}
              >
                {m.enabled ? 'Activo' : 'Oculto'}
              </button>
              <button onClick={() => remove(m.id)} className="text-red-400 hover:text-red-300 p-2">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {methods.length === 0 && <p className="text-white/40 text-sm">No hay métodos.</p>}
        </div>

        <div className="border-t border-elite-border pt-4">
          <p className="text-white/60 text-sm mb-3 font-medium">Agregar método</p>
          <div className="flex gap-2 flex-wrap items-center">
            <input
              className="input w-12 text-center"
              placeholder="🙂"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
            />
            <input
              className="input flex-1 min-w-[160px]"
              placeholder="Nombre (ej: PayPal)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <select
              className="input w-32"
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
            >
              <option value="ALL">Todos</option>
              <option value="VE">Venezuela</option>
              <option value="CO">Colombia</option>
            </select>
            <button onClick={add} className="btn-primary justify-center">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <p className="text-elite-primary text-sm mt-4 text-center">{msg}</p>
      )}
    </div>
  )
}

export default function Page() {
  return <AdminGuard><PagosAdmin /></AdminGuard>
}
