'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle, Copy, Check, Search, Bell, BellOff, RefreshCw, Clock,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'
import { formatUSD } from '@/lib/utils'
import { getActivityLogs, subscribeToTable } from '@/lib/data'
import { enlaceWhatsApp } from '@/lib/contacto'

/**
 * Puesto de trabajo para atender ventas.
 *
 * QUE TENIA DE MALO LO ANTERIOR
 * -----------------------------
 * Era una lista plana de TODOS los pedidos, del mas nuevo al mas viejo, sin
 * buscador ni filtro. Los tres que habia que atender quedaban enterrados entre
 * los cien ya entregados. No se refrescaba sola, asi que un cliente podia estar
 * esperando media hora sin que nadie lo supiera. Y no decia QUE habia comprado,
 * asi que para entregar los diamantes habia que abrir la base a mano.
 *
 * COMO ESTA AHORA
 * ---------------
 * - Lo pendiente primero, y por defecto.
 * - Llega solo: Realtime avisa del pedido nuevo con un sonido corto.
 * - Cada pedido trae lo necesario para cerrarlo sin salir de aqui: que compro,
 *   el ID de Free Fire con un toque para copiarlo, y WhatsApp ya escrito.
 * - Dinero de HOY y dinero pendiente de cobro, que es lo que se mira a diario.
 */
const ESTADOS = ['pending', 'paid', 'processing', 'delivered', 'cancelled'] as const
type Estado = (typeof ESTADOS)[number]

const ETIQUETA: Record<string, string> = {
  pending: 'Pendiente', paid: 'Pagado', processing: 'Procesando',
  delivered: 'Entregado', cancelled: 'Cancelado',
}
const COLOR: Record<string, string> = {
  pending: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  paid: 'text-elite-primary border-elite-primary/30 bg-elite-primary/10',
  processing: 'text-elite-secondary border-elite-secondary/30 bg-elite-secondary/10',
  delivered: 'text-elite-gold border-elite-gold/30 bg-elite-gold/10',
  cancelled: 'text-red-400 border-red-400/30 bg-red-400/10',
}

/** El siguiente paso natural de cada estado, para resolverlo de un toque. */
const SIGUIENTE: Partial<Record<Estado, { a: Estado; texto: string }>> = {
  pending: { a: 'paid', texto: 'Marcar pagado' },
  paid: { a: 'processing', texto: 'Empecé a enviar' },
  processing: { a: 'delivered', texto: 'Entregado ✓' },
}

const ACTION_LABEL: Record<string, string> = {
  store_view: 'Entró a la tienda', add_cart: 'Agregó al carrito', purchase: 'Compra',
}

function haceCuanto(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} d`
}

function esDeHoy(iso: string): boolean {
  const d = new Date(iso), h = new Date()
  return d.getDate() === h.getDate() && d.getMonth() === h.getMonth() && d.getFullYear() === h.getFullYear()
}

/**
 * Aviso sonoro corto, generado en el momento.
 *
 * Se sintetiza en vez de cargar un archivo porque un mp3 seria una peticion de
 * red mas y un archivo que mantener, para dos notas. Los navegadores no dejan
 * sonar nada hasta que el usuario interactua con la pagina, asi que si falla se
 * ignora: el aviso visual ya esta puesto.
 */
function pitido(): void {
  try {
    const Ctx = window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gan = ctx.createGain()
    osc.connect(gan); gan.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12)
    gan.gain.setValueAtTime(0.0001, ctx.currentTime)
    gan.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02)
    gan.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.start(); osc.stop(ctx.currentTime + 0.36)
    setTimeout(() => ctx.close(), 600)
  } catch {
    // Sin audio disponible el panel funciona igual.
  }
}

function PedidosAdmin() {
  const [rows, setRows] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [filtro, setFiltro] = useState<'atender' | Estado | 'todos'>('atender')
  const [busca, setBusca] = useState('')
  const [copiado, setCopiado] = useState<string | null>(null)
  const [sonido, setSonido] = useState(true)
  const [cargando, setCargando] = useState(true)
  const [nuevos, setNuevos] = useState(0)
  // producto_id -> coins que entrega. Permite ver en cada pedido si es una
  // recarga de Elite Coins y cuanto hay que acreditar al entregarla.
  const [coinsDe, setCoinsDe] = useState<Record<string, number>>({})

  // Para detectar pedidos nuevos hay que comparar contra lo que ya se vio. Va
  // en una ref y no en el estado: cambiarlo no debe repintar la pagina.
  const vistos = useRef<Set<string>>(new Set())
  const primeraCarga = useRef(true)
  const sonidoRef = useRef(sonido)
  useEffect(() => { sonidoRef.current = sonido }, [sonido])

  const load = useCallback(async () => {
    const sb = supabaseBrowser()
    if (!sb) { setCargando(false); return }
    const [{ data }, { data: packs }] = await Promise.all([
      sb.from('orders').select('*')
        .order('created_at', { ascending: false }).limit(300),
      sb.from('products').select('id, coins_entrega').gt('coins_entrega', 0),
    ])
    const filas = data || []
    setCoinsDe(Object.fromEntries(((packs as any[]) || []).map((p) => [p.id, p.coins_entrega])))

    if (primeraCarga.current) {
      primeraCarga.current = false
      for (const o of filas) vistos.current.add(o.id)
    } else {
      const recien = filas.filter((o: any) => !vistos.current.has(o.id))
      for (const o of filas) vistos.current.add(o.id)
      if (recien.length > 0) {
        setNuevos((n) => n + recien.length)
        if (sonidoRef.current) pitido()
      }
    }

    setRows(filas)
    setActivity(await getActivityLogs(60))
    setCargando(false)
  }, [])

  useEffect(() => {
    load()
    // Realtime: el pedido aparece solo. Si el canal no llega a conectarse, el
    // repaso cada 60 s cubre el hueco; entre los dos nunca se queda mudo.
    const off = subscribeToTable('orders', load)
    const id = setInterval(load, 60_000)
    return () => { off(); clearInterval(id) }
  }, [load])

  const setStatus = async (id: string, status: string) => {
    const sb = supabaseBrowser()
    if (!sb) return
    // Se pinta el cambio antes de que responda la base: en una tanda de diez
    // pedidos, esperar al servidor en cada uno hace el panel inusable.
    const previo = rows
    setRows((r) => r.map((o) => (o.id === id ? { ...o, status } : o)))
    const { error } = await sb.from('orders').update({ status }).eq('id', id)
    if (error) { setRows(previo); setMsg('No se pudo guardar: ' + error.message); return }
    setMsg('Actualizado ✓')
  }

  /**
   * Entregar una recarga de Elite Coins: la base acredita las coins en la
   * cuenta del comprador y cierra el pedido en la misma operacion. No se hace
   * con dos UPDATEs desde aqui porque una falla a mitad dejaria las coins
   * abonadas con el pedido aun abierto -o al reves- y la reclamacion llega
   * seguro.
   */
  const entregarCoins = async (o: any) => {
    const sb = supabaseBrowser()
    if (!sb) return
    const { data, error } = await sb.rpc('admin_entregar_coins_pedido', { p_pedido: o.id })
    const r = data as { ok?: boolean; error?: string; coins?: number; nombre?: string } | null
    if (error || !r?.ok) { setMsg(error?.message || r?.error || 'No se pudo entregar.'); return }
    setRows((rs) => rs.map((x) => (x.id === o.id ? { ...x, status: 'delivered' } : x)))
    setMsg(`${(r.coins ?? 0).toLocaleString('es')} coins acreditadas a ${r.nombre} ✓`)
  }

  // El aviso no se queda pegado en pantalla para siempre.
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 3000)
    return () => clearTimeout(t)
  }, [msg])

  const copiar = async (texto: string, marca: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(marca)
      setTimeout(() => setCopiado(null), 1600)
    } catch {
      // Sin permiso de portapapeles el dato sigue visible para copiarlo a mano.
    }
  }

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return rows.filter((o) => {
      if (filtro === 'atender') {
        if (o.status === 'delivered' || o.status === 'cancelled') return false
      } else if (filtro !== 'todos' && o.status !== filtro) return false
      if (!q) return true
      // Se busca por lo que uno tiene a mano cuando escribe un cliente: su
      // nombre, su ID de Free Fire, o el numero de pedido que le mando.
      return [o.customer_name, o.free_fire_id, o.order_number, o.customer_discord, o.notes]
        .some((c) => String(c ?? '').toLowerCase().includes(q))
    })
  }, [rows, filtro, busca])

  const activos = rows.filter((r) => r.status !== 'cancelled')
  const hoy = activos.filter((r) => esDeHoy(r.created_at))
  const cobrado = activos
    .filter((r) => r.status === 'paid' || r.status === 'processing' || r.status === 'delivered')
    .reduce((s, r) => s + (r.total_usd || 0), 0)
  const porCobrar = rows.filter((r) => r.status === 'pending')
    .reduce((s, r) => s + (r.total_usd || 0), 0)
  const pendientes = rows.filter((r) => r.status === 'pending').length
  const porAtender = rows.filter((r) => r.status !== 'delivered' && r.status !== 'cancelled').length
  const cuenta = (e: Estado) => rows.filter((r) => r.status === e).length

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="Ventas PagoStore" subtitle="Pedidos en vivo · lo pendiente primero" />

      {/* Cifras del dia. El total historico no dice nada al abrir por la
          mañana; lo que se mira es que entro hoy y que falta por cobrar. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-white/50 text-sm">Cobrado (histórico)</p>
          <p className="font-display font-bold text-2xl gradient-text">{formatUSD(cobrado)}</p>
        </div>
        <div className="card p-4">
          <p className="text-white/50 text-sm">Pedidos hoy</p>
          <p className="font-display font-bold text-2xl">{hoy.length}</p>
        </div>
        <div className={`card p-4 ${pendientes > 0 ? 'ring-1 ring-yellow-400/40' : ''}`}>
          <p className="text-white/50 text-sm">Esperando atención</p>
          <p className="font-display font-bold text-2xl text-yellow-400">{pendientes}</p>
        </div>
        <div className="card p-4">
          <p className="text-white/50 text-sm">Por cobrar</p>
          <p className="font-display font-bold text-2xl text-yellow-400/80">{formatUSD(porCobrar)}</p>
        </div>
      </div>

      {/* Barra de trabajo: filtro, buscador y avisos. */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {([
          ['atender', `Por atender (${porAtender})`],
          ['pending', `Pendientes (${cuenta('pending')})`],
          ['paid', `Pagados (${cuenta('paid')})`],
          ['processing', `Procesando (${cuenta('processing')})`],
          ['delivered', `Entregados (${cuenta('delivered')})`],
          ['todos', `Todos (${rows.length})`],
        ] as ['atender' | Estado | 'todos', string][]).map(([v, txt]) => (
          <button
            key={v}
            onClick={() => setFiltro(v)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              filtro === v
                ? 'border-elite-primary/60 bg-elite-primary/15 text-elite-primary'
                : 'border-elite-border text-white/50 hover:text-white/80'
            }`}
          >
            {txt}
          </button>
        ))}

        <div className="relative ml-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            className="input pl-9 w-64"
            placeholder="Nombre, ID de FF o pedido…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <button
          onClick={() => setSonido((s) => !s)}
          title={sonido ? 'Silenciar avisos' : 'Activar avisos'}
          aria-label={sonido ? 'Silenciar avisos' : 'Activar avisos'}
          className="p-2 rounded-lg border border-elite-border text-white/50 hover:text-white/80 transition-colors"
        >
          {sonido ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
        <button
          onClick={() => { setCargando(true); load() }}
          title="Actualizar"
          aria-label="Actualizar"
          className="p-2 rounded-lg border border-elite-border text-white/50 hover:text-white/80 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {nuevos > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => { setNuevos(0); setFiltro('atender') }}
            className="w-full mb-4 py-2.5 rounded-xl border border-elite-primary/40 bg-elite-primary/10 text-elite-primary font-display font-semibold"
          >
            {nuevos === 1 ? '1 pedido nuevo' : `${nuevos} pedidos nuevos`} · toca para verlos
          </motion.button>
        )}
      </AnimatePresence>

      {msg && <p className="text-elite-primary mb-4 text-sm">{msg}</p>}

      <div className="space-y-2 mb-10">
        {cargando && rows.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card h-24 animate-pulse bg-white/[0.03]" />
            ))}
          </div>
        )}
        {!cargando && visibles.length === 0 && (
          <p className="text-white/40 py-8 text-center">
            {rows.length === 0
              ? 'No hay pedidos todavía.'
              : filtro === 'atender'
                ? 'Todo atendido. No queda nada pendiente ✓'
                : 'Ningún pedido coincide con esa búsqueda.'}
          </p>
        )}

        {visibles.map((o) => {
          const sig = SIGUIENTE[o.status as Estado]
          const urgente = o.status === 'pending'
          // Pedido de Elite Coins: el producto dice cuantas acreditar.
          const coins = (o.product_id ? coinsDe[o.product_id] : 0) * Math.max(o.quantity ?? 1, 1) || 0
          const cerrado = o.status === 'delivered' || o.status === 'cancelled'
          return (
            <motion.div key={o.id} layout className={`card-glow p-4 ${urgente ? 'border-yellow-400/25' : ''}`}>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-bold">{o.customer_name}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${COLOR[o.status] || ''}`}>
                      {ETIQUETA[o.status] || o.status}
                    </span>
                    <span className="text-white/30 text-xs inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {haceCuanto(o.created_at)}
                    </span>
                  </div>

                  {/* QUE compro. Sin esto habia que abrir la base para saber
                      cuantos diamantes mandar. */}
                  <p className="text-white/75 text-sm mt-1">
                    {coins > 0 && <span title="Recarga de Elite Coins">🪙 </span>}
                    {o.notes || `${o.quantity ?? 1} artículo(s)`} ·{' '}
                    <span className="font-semibold">{formatUSD(o.total_usd)}</span> ·{' '}
                    {o.payment_method || 'sin método'}
                  </p>

                  <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs">
                    {/* El ID de Free Fire se copia de un toque: es lo que se
                        pega en el juego para entregar, y equivocar una cifra
                        manda los diamantes a un desconocido. */}
                    <button
                      onClick={() => copiar(String(o.free_fire_id ?? ''), 'ff' + o.id)}
                      className="inline-flex items-center gap-1.5 text-white/50 hover:text-elite-primary transition-colors font-mono"
                      title="Copiar ID de Free Fire"
                    >
                      {copiado === 'ff' + o.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      FF: {o.free_fire_id || '—'}
                    </button>
                    <button
                      onClick={() => copiar(String(o.order_number ?? ''), 'ref' + o.id)}
                      className="inline-flex items-center gap-1.5 text-white/35 hover:text-elite-primary transition-colors font-mono"
                      title="Copiar referencia"
                    >
                      {copiado === 'ref' + o.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {o.order_number}
                    </button>
                    {o.customer_discord && <span className="text-white/35">{o.customer_discord}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Si el cliente dejo un numero, se le escribe desde aqui con
                      el mensaje ya redactado. */}
                  {o.customer_discord && /\d{7,}/.test(String(o.customer_discord)) && (
                    <a
                      href={enlaceWhatsApp(
                        `Hola ${o.customer_name}, te escribo de La Elite PvP por tu pedido ${o.order_number} (${o.notes || ''}).`,
                        String(o.customer_discord)
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors"
                      title="Escribir por WhatsApp"
                      aria-label="Escribir por WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}

                  {/* Un toque para el paso siguiente; el desplegable queda para
                      los casos raros (cancelar, corregir).
                      Las recargas de coins saltan directo a entregar: la
                      funcion acredita y cierra en la misma operacion. */}
                  {coins > 0 && !cerrado ? (
                    o.created_by ? (
                      <button
                        onClick={() => entregarCoins(o)}
                        className="btn-primary text-sm py-2 px-3 whitespace-nowrap"
                      >
                        Entregar {coins.toLocaleString('es')} coins
                      </button>
                    ) : (
                      <span className="text-xs text-amber-400 max-w-[180px] text-right">
                        Sin cuenta ligada: acredita a mano desde Economía
                      </span>
                    )
                  ) : (
                    sig && (
                      <button
                        onClick={() => setStatus(o.id, sig.a)}
                        className="btn-primary text-sm py-2 px-3 whitespace-nowrap"
                      >
                        {sig.texto}
                      </button>
                    )
                  )}
                  <select
                    className="input w-auto text-sm"
                    value={o.status}
                    aria-label="Cambiar estado"
                    onChange={(e) => setStatus(o.id, e.target.value)}
                  >
                    {ESTADOS.map((s) => <option key={s} value={s}>{ETIQUETA[s]}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <h2 className="font-display font-bold text-xl mb-3">Actividad de usuarios</h2>
      <div className="space-y-2">
        {activity.length === 0 && <p className="text-white/40">Sin actividad registrada.</p>}
        {activity.map((a) => (
          <div key={a.id} className="card p-3 flex items-center justify-between gap-3 text-sm">
            <div>
              <span className={`font-bold ${a.action === 'purchase' ? 'text-elite-gold' : 'text-elite-primary'}`}>
                {ACTION_LABEL[a.action] || a.action}
              </span>
              {a.metadata?.customer && (
                <span className="text-white/60"> · {a.metadata.customer} (FF:{a.metadata.ffid})</span>
              )}
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
