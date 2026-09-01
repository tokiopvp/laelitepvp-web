'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Coins } from 'lucide-react'
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
 *
 * EL ESTILO ES EL DE "COMO GANO"
 * ------------------------------
 * Mismo panel (gradiente primario→oro, rejilla de fondo), mismos iconos con
 * glow por color y la entrada en cadena. La via gratuita y la de pago se ven
 * como dos caras de lo mismo, no como un anuncio pegado encima.
 */

// Un color por nivel de pack: la rampa termina en oro, que es el de 1M.
const COLORES = ['#00d4ff', '#5b9dff', '#8b5cf6', '#f0b429']

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
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-elite-primary/[0.07] via-transparent to-elite-gold/[0.05] p-4 sm:p-5">
      {/* Rejilla de fondo: la misma de "Como gano", para que la via de pago
          se vea como parte de la misma pagina y no como un anuncio. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      <div className="relative">
        <h2 className="font-display font-bold text-lg sm:text-xl text-center mb-5">
          ¿Sin tiempo de grindear? <span className="text-elite-gold">Compra coins</span>
          <span className="text-white/35 font-normal text-sm ml-2">Directo a tu cuenta.</span>
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cargando
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl h-24 animate-pulse bg-white/[0.04]" />
              ))
            : packs.map((p, i) => {
                const color = COLORES[Math.min(i, COLORES.length - 1)]
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    onClick={() => abrir(p)}
                    className="relative text-center group"
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    // El escalonado de "Como gano": los packs entran en orden
                    // de menor a mayor y la rampa se lee sola.
                    transition={{ delay: i * 0.12, duration: 0.45, ease: 'easeOut' }}
                    aria-label={`Comprar ${p.name}`}
                  >
                    {!!p.is_featured && (
                      <span className="absolute -top-1.5 right-0 z-10 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-elite-gold/15 text-elite-gold border border-elite-gold/30">
                        TOP
                      </span>
                    )}
                    <div
                      className="mx-auto w-10 h-10 rounded-xl grid place-items-center mb-2 border transition-transform group-hover:scale-110"
                      style={{
                        borderColor: color + '55',
                        background: color + '14',
                        boxShadow: `0 0 28px ${color}22`,
                      }}
                    >
                      <Coins className="w-5 h-5" style={{ color }} />
                    </div>
                    <p className="font-display font-bold text-base sm:text-lg leading-tight tabular-nums">
                      {(p.coins_entrega ?? 0).toLocaleString('es')}
                    </p>
                    <p className="text-white/40 text-[10px] uppercase tracking-wide mb-1.5">Elite Coins</p>
                    <p className="font-mono font-semibold text-elite-gold text-sm">{precioLocal(p)}</p>
                  </motion.button>
                )
              })}
        </div>

        {/* El pais define el metodo de pago y el precio local: una sola
            eleccion para los cuatro packs. Chiquito, abajo, sin competir con
            el titulo. */}
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
            cuenta para acreditarla al entregar. El boton es el MISMO de la
            cabecera de la pagina: si la puerta de entrada se ve igual en
            todos lados, nadie duda de a donde lleva. */}
        {!isAuthed && (
          <div className="flex justify-center mt-4">
            <button
              onClick={signIn}
              className="inline-flex items-center gap-3 rounded-xl px-6 py-3.5 font-display font-bold text-base text-white transition-transform hover:scale-[1.03] active:scale-100"
              style={{
                background: 'linear-gradient(135deg,#5865F2,#4148c4)',
                boxShadow: '0 10px 30px rgba(88,101,242,.35)',
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.213.382-.46.898-.63 1.307a18.27 18.27 0 0 0-5.51 0A12.6 12.6 0 0 0 9.11 3 19.74 19.74 0 0 0 4.677 4.37C1.83 8.59 1.05 12.7 1.47 16.75a19.9 19.9 0 0 0 6.04 3.04c.49-.66.927-1.36 1.302-2.096-.716-.27-1.4-.6-2.043-.998.171-.125.338-.256.5-.39a14.2 14.2 0 0 0 12.142 0c.164.136.33.267.5.39-.644.4-1.327.73-2.044.999.375.736.81 1.436 1.302 2.096a19.86 19.86 0 0 0 6.046-3.04c.47-4.67-.787-8.74-3.135-12.381ZM8.52 14.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm6.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z" />
              </svg>
              Entra con Discord para comprar coins
            </button>
          </div>
        )}
      </div>

      {/* Modal del checkout. El fondo es OPACO a proposito: con el cristal de
          card-glow el contenido de la pagina se transparentaba y el
          desplegable del metodo se leia sobre el catalogo. */}
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
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-x-0 sm:mx-auto sm:max-w-md z-50 rounded-2xl border border-elite-border bg-elite-dark shadow-2xl shadow-black/60 p-6"
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
                  {metodosDelPais.map((m) => <option key={m.id} value={m.nombre} className="bg-elite-dark">{m.nombre}</option>)}
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
