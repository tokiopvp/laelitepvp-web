'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  getMetodosPago, getRates, getSetting, createOrder,
  logActivity, notifyDiscord, getPacksCoins,
  type MetodoPago,
} from '@/lib/data'
import { paisPorCodigo, adivinarPais, formatearLocal, banderaDe, PAISES, PAIS_INTERNACIONAL } from '@/lib/paises'
import type { Product } from '@/lib/types'
import PantallaPago from '@/components/store/PantallaPago'
import { WHATSAPP } from '@/lib/contacto'
import { agregarPendientes, leerDatos, guardarDatos } from '@/lib/carrito'

/**
 * Recarga de Elite Coins con dinero real.
 *
 * POR QUE EXIGE LOGIN
 * -------------------
 * Las coins se acreditan a la cuenta al aceptar el pedido en el panel, asi que
 * la compra tiene que llevar ligada la cuenta del comprador (`orders.created_by`).
 * Sin login no hay cuenta y el pedido naceria imposible de entregar.
 *
 * COMO SE PAGA
 * ------------
 * El mismo circuito que la tienda de diamantes: metodo del pais, pedido con
 * referencia, pantalla con los datos para pagar y el comprobante por WhatsApp.
 * Las mismas piezas, reusadas: PantallaPago, metodos de `pagos_json`, tasas en
 * vivo y el aviso al Discord del clan.
 */
export default function CompraCoins() {
  const { user, isAuthed, signIn } = useAuth()

  const [packs, setPacks] = useState<Product[]>([])
  const [cargando, setCargando] = useState(true)
  const [metodos, setMetodos] = useState<MetodoPago[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [whatsapp, setWhatsapp] = useState<string>(WHATSAPP)
  const [country, setCountry] = useState<string>('ALL')

  const [elegido, setElegido] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', whatsapp: '', method: '' })
  const [enviando, setEnviando] = useState(false)
  const [formError, setFormError] = useState('')
  // La pantalla de pago necesita el importe aunque el pedido ya se cerro.
  const [cobro, setCobro] = useState<{ refs: string[]; usd: number; local: string | null; metodo: string } | null>(null)

  useEffect(() => {
    getPacksCoins().then(setPacks).finally(() => setCargando(false))
    getMetodosPago().then(setMetodos)
    getRates().then(setRates).catch(() => {})
    getSetting('whatsapp_number').then((v) => { if (v && v.trim()) setWhatsapp(v.trim()) })
    const datos = leerDatos()
    if (datos) setForm((f) => ({ ...f, name: datos.name, whatsapp: datos.discord }))
    const guardado = typeof window !== 'undefined' ? localStorage.getItem('store_country') : null
    setCountry(guardado || adivinarPais())
  }, [])

  const pais = paisPorCodigo(country)
  const currency = pais.moneda
  const tasa = currency === 'USD' ? null : (rates[currency] ?? null)

  /** Precio local del pack: el cerrado por pais si lo hay, si no la tasa. */
  const precioLocal = (p: Product) => {
    const fijo = p.precios_locales?.[pais.code]
    return formatearLocal(p.price_usd, pais, tasa, fijo ?? null)
  }

  const metodosDelPais = metodos.filter(
    (m) => m.paises.length === 0 || m.paises.includes(country)
  )

  // Que el metodo elegido siempre exista en el pais que se mira.
  useEffect(() => {
    if (metodosDelPais.length && !metodosDelPais.some((m) => m.nombre === form.method)) {
      setForm((f) => ({ ...f, method: metodosDelPais[0].nombre }))
    }
  }, [metodosDelPais, form.method])

  const abrir = (p: Product) => {
    setFormError('')
    setElegido(p)
    logActivity('add_cart', { product: p.name })
  }

  const comprar = async () => {
    if (!elegido || !user) return
    setFormError('')
    if (!form.name.trim()) return setFormError('Ingresa tu nombre.')
    if (!form.method) return setFormError('Elige un método de pago.')

    setEnviando(true)
    const referencia = `ELITE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const { error } = await createOrder({
      order_number: referencia,
      customer_name: form.name.trim(),
      customer_discord: form.whatsapp.trim() || null,
      product_id: elegido.id,
      quantity: 1,
      total_usd: elegido.price_usd,
      payment_method: form.method,
      created_by: user.id,
      notes: `1x ${elegido.name} · ${pais.nombre} · ${precioLocal(elegido)}`,
    })
    setEnviando(false)
    if (error) return setFormError('No se pudo enviar el pedido. Intenta de nuevo.')

    await logActivity('purchase', {
      customer: form.name.trim(),
      method: form.method,
      total: elegido.price_usd,
      orders: [referencia],
    })
    await notifyDiscord({
      type: 'purchase',
      customer: form.name.trim(),
      method: form.method,
      total: elegido.price_usd,
      pais: pais.nombre,
      total_local: currency === 'USD' ? null : precioLocal(elegido),
      moneda: currency,
      whatsapp: form.whatsapp.trim() || null,
      detalle: `1x ${elegido.name}`,
      orders: [referencia],
    })

    agregarPendientes([{
      referencia,
      creado: Date.now(),
      totalUSD: elegido.price_usd,
      totalLocal: currency === 'USD' ? null : precioLocal(elegido),
      metodo: form.method,
      detalle: `1x ${elegido.name}`,
      estado: 'pending',
    }])
    guardarDatos({ name: form.name.trim(), ffid: '', discord: form.whatsapp.trim() })

    setCobro({
      refs: [referencia],
      usd: elegido.price_usd,
      local: currency === 'USD' ? null : precioLocal(elegido),
      metodo: form.method,
    })
    setElegido(null)
  }

  if (!cargando && packs.length === 0) return null

  return (
    <section className="card-glow p-6">
      <div className="text-center mb-5">
        <h2 className="font-display font-bold text-2xl sm:text-3xl">
          ¿Sin tiempo de grindear? <span className="text-elite-gold">Compra coins</span>
        </h2>
        <p className="text-white/40 text-sm mt-1">
          Pagas, mandas el comprobante y las coins caen directo en tu cuenta.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cargando
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/10 h-24 animate-pulse bg-white/[0.03]" />
            ))
          : packs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => abrir(p)}
                className="relative rounded-xl border border-white/10 bg-white/[0.03] py-4 px-3 text-center hover:border-elite-gold/50 hover:bg-elite-gold/[0.06] transition-colors"
              >
                {!!p.is_featured && (
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-elite-gold/15 text-elite-gold border border-elite-gold/30">
                    TOP
                  </span>
                )}
                <p className="font-display font-bold text-lg leading-tight tabular-nums">
                  {(p.coins_entrega ?? 0).toLocaleString('es')}
                </p>
                <p className="text-[10px] text-white/35 uppercase tracking-wide">Elite Coins</p>
                <p className="font-mono font-semibold text-elite-gold mt-2">{precioLocal(p)}</p>
              </button>
            ))}
      </div>

      {/* El pais define el metodo de pago y el precio local: una sola eleccion
          para los cuatro packs. Va chiquito abajo para no competir con el
          titulo. */}
      <div className="flex justify-center mt-4">
        <select
          value={country}
          onChange={(e) => {
            setCountry(e.target.value)
            if (typeof window !== 'undefined') localStorage.setItem('store_country', e.target.value)
          }}
          className="bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 text-xs font-semibold text-white/70 focus:outline-none cursor-pointer"
          aria-label="Elige tu país"
        >
          {[PAIS_INTERNACIONAL, ...PAISES].map((x) => (
            <option key={x.code} value={x.code} className="bg-elite-dark">
              {banderaDe(x.code)} {x.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Sin login no se puede comprar coins: el pedido nace ligado a la
          cuenta para acreditarla al entregar. El boton hereda el estilo del
          login de la cabecera de la pagina. */}
      {!isAuthed && (
        <button onClick={signIn} className="mt-4 w-full py-2.5 rounded-xl border border-elite-gold/40 text-elite-gold font-display font-bold hover:bg-elite-gold/10 transition-colors">
          Entra con Discord para comprar coins
        </button>
      )}

      {/* Modal del checkout: solo el pack elegido, el nombre para el recibo y
          el metodo. Menos campos = menos abandono. */}
      <AnimatePresence>
        {elegido && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/70 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setElegido(null)}
            />
            <motion.div
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-0 sm:mx-auto sm:max-w-md z-50 card-glow p-6"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold text-xl">
                    {elegido.coins_entrega?.toLocaleString('es')} Elite Coins
                  </h3>
                  <p className="text-elite-gold font-mono font-semibold">{precioLocal(elegido)}</p>
                </div>
                <button onClick={() => setElegido(null)} className="text-white/60 hover:text-white" aria-label="Cerrar">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <input
                  className="input"
                  placeholder="Tu nombre *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="input"
                  type="tel"
                  inputMode="tel"
                  placeholder="Tu WhatsApp (para avisarte)"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
                <select
                  className="input"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  {metodosDelPais.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                </select>
              </div>

              {formError && <p className="text-red-400 text-sm mb-3">{formError}</p>}

              <button onClick={comprar} disabled={enviando} className="btn-primary w-full justify-center">
                {enviando ? 'Enviando…' : 'Confirmar pedido'} <Zap className="w-4 h-4" />
              </button>
              <p className="text-white/40 text-xs mt-3 text-center">
                Verás los datos para pagar. Las coins se acreditan al confirmar tu pago.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* La misma pantalla de pago de la tienda: datos de la cuenta, importe
          exacto y el numero de pedido para el comprobante. */}
      <AnimatePresence>
        {cobro && (
          <PantallaPago
            pedidos={cobro.refs}
            totalUSD={cobro.usd}
            totalLocal={cobro.local}
            pais={pais}
            metodos={metodos}
            metodoElegido={cobro.metodo}
            whatsapp={whatsapp}
            onCerrar={() => setCobro(null)}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
