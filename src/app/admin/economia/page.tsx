'use client'

import { useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'
import { operarCasa, coinsCorto, precioTexto } from '@/lib/economia'
import type { Tarea, ItemTienda, Casa } from '@/lib/economia'

/**
 * Panel de la economía Elite Coin.
 *
 * POR QUÉ TODO ES EDITABLE AQUÍ
 * -----------------------------
 * Una economía de recompensas no se acierta a la primera: o un premio se vacía
 * el primer día, o nadie llega nunca y la tienda se vuelve decorado. Ajustar eso
 * tiene que costar treinta segundos desde el móvil, no un despliegue. Por eso
 * los precios, las recompensas, los topes de Discord y hasta el comportamiento
 * del mercado viven en la base de datos y se editan desde aquí.
 *
 * La palanca de Barron Trump (comprar/vender) es la corrección manual: cuando el
 * precio se dispare, vendes y lo bajas.
 */

/** Los ajustes que de verdad se tocan, con su explicación en corto. */
const AJUSTES: { key: string; label: string; ayuda: string }[] = [
  { key: 'eco.discord_voz_minuto',   label: 'Coins por minuto en voz',      ayuda: 'Lo que paga cada minuto conectado a un canal de voz.' },
  { key: 'eco.discord_voz_max_dia',  label: 'Tope diario de voz (coins)',   ayuda: 'Freno para que nadie imprima coins durmiendo con el micro abierto.' },
  { key: 'eco.discord_msg',          label: 'Coins por mensaje',            ayuda: 'Lo que paga cada mensaje válido en el Discord.' },
  { key: 'eco.discord_msg_max_dia',  label: 'Tope diario de mensajes',      ayuda: 'Freno anti-spam: por encima de esto, escribir ya no paga.' },
  { key: 'eco.discord_msg_cooldown', label: 'Segundos entre mensajes',      ayuda: 'Mensajes seguidos dentro de esta ventana no cuentan.' },
  { key: 'eco.mercado_deriva',       label: 'Deriva alcista por vela',      ayuda: 'Subida de fondo. 0.0012 = +0,12% por vela. Es lo que hace que siempre tienda a subir.' },
  { key: 'eco.mercado_ruido',        label: 'Ruido del mercado',            ayuda: 'Amplitud del vaivén. Más alto = velas más grandes en los dos sentidos.' },
  { key: 'eco.mercado_impacto',      label: 'Impacto por coin ganada',      ayuda: 'Cuánto empuja el precio cada coin que gana la comunidad.' },
  { key: 'eco.mercado_barron_prob',  label: 'Probabilidad de venta',        ayuda: '0.35 = Barron vende en un 35% de las velas. Es lo que crea las rojas.' },
  { key: 'eco.mercado_barron_fuerza',label: 'Fuerza de esas ventas',        ayuda: 'Cuánto pesa cada venta automática de la casa.' },
  { key: 'eco.mercado_minutos_vela', label: 'Minutos por vela',             ayuda: 'Duración de cada vela del gráfico.' },
]

function EconomiaAdmin() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [items, setItems] = useState<ItemTienda[]>([])
  const [ajustes, setAjustes] = useState<Record<string, string>>({})
  const [casa, setCasa] = useState<Casa | null>(null)
  const [precio, setPrecio] = useState<number>(0)
  const [canjes, setCanjes] = useState<any[]>([])
  const [monto, setMonto] = useState('50000')
  const [msg, setMsg] = useState('')

  const sb = () => supabaseBrowser()

  const cargar = async () => {
    const c = sb()
    if (!c) return
    const [t, i, s, h, r, p] = await Promise.all([
      c.from('tasks').select('*').order('orden'),
      c.from('shop_items').select('*').order('orden'),
      c.from('settings').select('key,value').like('key', 'eco.%'),
      c.from('house_account').select('*').eq('id', 1).maybeSingle(),
      c.from('redemptions').select('*').order('created_at', { ascending: false }).limit(30),
      c.rpc('market_precio'),
    ])
    setTareas((t.data as Tarea[]) || [])
    setItems((i.data as ItemTienda[]) || [])
    setAjustes(Object.fromEntries(((s.data as any[]) || []).map((x) => [x.key, x.value ?? ''])))
    setCasa((h.data as Casa) ?? null)
    setCanjes((r.data as any[]) || [])
    setPrecio(Number(p.data) || 0)
  }

  useEffect(() => {
    cargar()
  }, [])

  const avisar = (t: string) => {
    setMsg(t)
    setTimeout(() => setMsg(''), 3000)
  }

  // --- Guardado en línea. Se escribe la fila entera al salir del campo:
  // un botón "guardar" global obliga a recordar qué se tocó. ---
  const guardarTarea = async (t: Tarea, campo: keyof Tarea, valor: any) => {
    const c = sb()
    if (!c) return
    const { error } = await c.from('tasks').update({ [campo]: valor }).eq('id', t.id)
    avisar(error ? error.message : 'Guardado ✓')
    if (!error) setTareas((ts) => ts.map((x) => (x.id === t.id ? { ...x, [campo]: valor } : x)))
  }

  const guardarItem = async (it: ItemTienda, campo: keyof ItemTienda, valor: any) => {
    const c = sb()
    if (!c) return
    const { error } = await c.from('shop_items').update({ [campo]: valor }).eq('id', it.id)
    avisar(error ? error.message : 'Guardado ✓')
    if (!error) setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, [campo]: valor } : x)))
  }

  const guardarAjuste = async (key: string, value: string) => {
    const c = sb()
    if (!c) return
    const { error } = await c
      .from('settings')
      .upsert({ key, value, updated_at: new Date().toISOString() })
    avisar(error ? error.message : 'Guardado ✓')
  }

  const operar = async (lado: 'compra' | 'venta') => {
    const n = parseInt(monto, 10)
    if (!n || n <= 0) return avisar('Pon una cantidad válida.')
    const r = await operarCasa(lado, n)
    avisar(r.ok ? `${lado === 'compra' ? 'Compraste' : 'Vendiste'} ${coinsCorto(n)} coins` : r.error || 'Error')
    cargar()
  }

  const moverCanje = async (id: string, estado: string) => {
    const c = sb()
    if (!c) return
    await c.from('redemptions').update({ estado, updated_at: new Date().toISOString() }).eq('id', id)
    cargar()
  }

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="Economía Elite Coin" subtitle="Tareas, tienda, mercado y canjes" />
      {msg && <p className="text-elite-primary mb-4 font-display">{msg}</p>}

      {/* ---------- MERCADO ---------- */}
      <section className="card-glow p-6 mb-8">
        <h2 className="font-display font-bold text-xl mb-1">Mercado</h2>
        <p className="text-white/40 text-sm mb-5">
          Tu mano como {casa?.nombre || 'la casa'}. Vender baja el precio, comprar lo sube.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          <div className="rounded-lg border border-white/10 p-4">
            <p className="text-white/40 text-xs">Precio actual</p>
            <p className="font-mono font-bold text-2xl text-elite-gold">{precioTexto(precio)}</p>
          </div>
          <div className="rounded-lg border border-white/10 p-4">
            <p className="text-white/40 text-xs">Saldo de la casa</p>
            <p className="font-mono font-bold text-2xl">{coinsCorto(casa?.coins ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-white/10 p-4">
            <p className="text-white/40 text-xs">Canjes pendientes</p>
            <p className="font-mono font-bold text-2xl text-amber-400">
              {canjes.filter((r) => r.estado === 'pendiente').length}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input w-40"
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Coins"
          />
          <button
            onClick={() => operar('compra')}
            className="px-4 py-2 rounded-lg border border-elite-success/40 text-elite-success font-display font-bold hover:bg-elite-success/10"
          >
            Comprar (sube)
          </button>
          <button
            onClick={() => operar('venta')}
            className="px-4 py-2 rounded-lg border border-elite-danger/40 text-elite-danger font-display font-bold hover:bg-elite-danger/10"
          >
            Vender (baja)
          </button>
        </div>
      </section>

      {/* ---------- AJUSTES ---------- */}
      <section className="card-glow p-6 mb-8">
        <h2 className="font-display font-bold text-xl mb-1">Ajustes</h2>
        <p className="text-white/40 text-sm mb-5">
          Se aplican al instante, sin desplegar nada.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AJUSTES.map((a) => (
            <label key={a.key} className="block">
              <span className="text-sm text-white/70 font-display">{a.label}</span>
              <input
                className="input w-full mt-1"
                defaultValue={ajustes[a.key] ?? ''}
                onBlur={(e) => guardarAjuste(a.key, e.target.value.trim())}
              />
              <span className="text-[11px] text-white/30 block mt-1 leading-snug">{a.ayuda}</span>
            </label>
          ))}
        </div>
      </section>

      {/* ---------- TIENDA ---------- */}
      <section className="card-glow p-6 mb-8 overflow-x-auto">
        <h2 className="font-display font-bold text-xl mb-1">Tienda</h2>
        <p className="text-white/40 text-sm mb-5">
          Referencia actual: 1.000.000 coins = premio de 100 USD.
        </p>
        <table className="w-full text-sm min-w-[860px]">
          <thead className="text-white/40 text-xs font-display">
            <tr className="text-left">
              <th className="pb-2">Premio</th>
              <th className="pb-2 w-32">Precio (coins)</th>
              <th className="pb-2 w-28">Diamantes</th>
              <th className="pb-2 w-24">USD</th>
              <th className="pb-2 w-28">Rareza</th>
              <th className="pb-2 w-24">Stock</th>
              <th className="pb-2 w-20">/día</th>
              <th className="pb-2 w-20">Clan</th>
              <th className="pb-2 w-20">Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {items.map((it) => (
              <tr key={it.id}>
                <td className="py-2 pr-3 font-display font-semibold">{it.nombre}</td>
                <td className="py-2 pr-2">
                  <input className="input w-full" type="number" defaultValue={it.precio_coins}
                    onBlur={(e) => guardarItem(it, 'precio_coins', +e.target.value)} />
                </td>
                <td className="py-2 pr-2">
                  <input className="input w-full" type="number" defaultValue={it.diamantes ?? ''}
                    onBlur={(e) => guardarItem(it, 'diamantes', e.target.value === '' ? null : +e.target.value)} />
                </td>
                <td className="py-2 pr-2">
                  <input className="input w-full" type="number" step="0.01" defaultValue={it.valor_usd ?? ''}
                    onBlur={(e) => guardarItem(it, 'valor_usd', e.target.value === '' ? null : +e.target.value)} />
                </td>
                <td className="py-2 pr-2">
                  <select className="input w-full" defaultValue={it.rareza}
                    onChange={(e) => guardarItem(it, 'rareza', e.target.value)}>
                    {['basura', 'normal', 'epico', 'legendario'].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input className="input w-full" type="number" defaultValue={it.stock}
                    title="-1 = ilimitado"
                    onBlur={(e) => guardarItem(it, 'stock', +e.target.value)} />
                </td>
                <td className="py-2 pr-2">
                  <input className="input w-full" type="number" defaultValue={it.limite_dia}
                    title="0 = sin límite"
                    onBlur={(e) => guardarItem(it, 'limite_dia', +e.target.value)} />
                </td>
                <td className="py-2 text-center">
                  <input type="checkbox" defaultChecked={it.solo_clan}
                    onChange={(e) => guardarItem(it, 'solo_clan', e.target.checked)} />
                </td>
                <td className="py-2 text-center">
                  <input type="checkbox" defaultChecked={it.activo}
                    onChange={(e) => guardarItem(it, 'activo', e.target.checked)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ---------- TAREAS ---------- */}
      <section className="card-glow p-6 mb-8 overflow-x-auto">
        <h2 className="font-display font-bold text-xl mb-1">Tareas</h2>
        <p className="text-white/40 text-sm mb-5">
          El nivel 1–10 marca el tamaño de la vela que deja en el gráfico.
        </p>
        <table className="w-full text-sm min-w-[860px]">
          <thead className="text-white/40 text-xs font-display">
            <tr className="text-left">
              <th className="pb-2">Tarea</th>
              <th className="pb-2 w-36">Métrica</th>
              <th className="pb-2 w-28">Objetivo</th>
              <th className="pb-2 w-28">Coins</th>
              <th className="pb-2 w-28">Periodo</th>
              <th className="pb-2 w-28">Público</th>
              <th className="pb-2 w-20">Nivel</th>
              <th className="pb-2 w-20">Activa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {tareas.map((t) => (
              <tr key={t.id}>
                <td className="py-2 pr-3">
                  <span className="mr-1.5">{t.icono}</span>
                  <span className="font-display font-semibold">{t.titulo}</span>
                </td>
                <td className="py-2 pr-2 font-mono text-xs text-white/50">{t.metrica}</td>
                <td className="py-2 pr-2">
                  <input className="input w-full" type="number" step="0.1" defaultValue={t.objetivo}
                    onBlur={(e) => guardarTarea(t, 'objetivo', +e.target.value)} />
                </td>
                <td className="py-2 pr-2">
                  <input className="input w-full" type="number" defaultValue={t.coins}
                    onBlur={(e) => guardarTarea(t, 'coins', +e.target.value)} />
                </td>
                <td className="py-2 pr-2">
                  <select className="input w-full" defaultValue={t.periodo}
                    onChange={(e) => guardarTarea(t, 'periodo', e.target.value)}>
                    {['diaria', 'semanal', 'unica'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <select className="input w-full" defaultValue={t.publico}
                    onChange={(e) => guardarTarea(t, 'publico', e.target.value)}>
                    <option value="todos">comunidad</option>
                    <option value="clan">clan</option>
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input className="input w-full" type="number" min={1} max={10} defaultValue={t.nivel}
                    onBlur={(e) => guardarTarea(t, 'nivel', +e.target.value)} />
                </td>
                <td className="py-2 text-center">
                  <input type="checkbox" defaultChecked={t.activa}
                    onChange={(e) => guardarTarea(t, 'activa', e.target.checked)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ---------- CANJES ---------- */}
      <section className="card-glow p-6">
        <h2 className="font-display font-bold text-xl mb-1">Canjes</h2>
        <p className="text-white/40 text-sm mb-5">Lo que hay que entregar.</p>
        {canjes.length === 0 ? (
          <p className="text-white/30 text-sm">Todavía no hay canjes.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {canjes.map((r) => (
              <li key={r.id} className="py-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-sm">{r.item_nombre}</p>
                  <p className="text-white/40 text-xs font-mono">
                    FF ID: {r.free_fire_id || '—'} · {coinsCorto(r.coins)} coins ·{' '}
                    {new Date(r.created_at).toLocaleString('es')}
                  </p>
                </div>
                <span
                  className={`text-xs font-display px-2 py-0.5 rounded border ${
                    r.estado === 'entregado'
                      ? 'border-elite-success/40 text-elite-success'
                      : r.estado === 'rechazado'
                        ? 'border-elite-danger/40 text-elite-danger'
                        : 'border-amber-400/40 text-amber-400'
                  }`}
                >
                  {r.estado}
                </span>
                {r.estado === 'pendiente' && (
                  <>
                    <button onClick={() => moverCanje(r.id, 'entregado')}
                      className="text-xs px-3 py-1.5 rounded border border-elite-success/40 text-elite-success hover:bg-elite-success/10">
                      Entregado
                    </button>
                    <button onClick={() => moverCanje(r.id, 'rechazado')}
                      className="text-xs px-3 py-1.5 rounded border border-white/15 text-white/50 hover:bg-white/5">
                      Rechazar
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default function Page() {
  return (
    <AdminGuard>
      <EconomiaAdmin />
    </AdminGuard>
  )
}
