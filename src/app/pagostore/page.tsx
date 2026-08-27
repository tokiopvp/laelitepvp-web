'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gem, ShoppingCart, Zap, Crown, Star, Package, Ticket, X, Plus, Minus, CheckCircle2, Trash2, Activity, MessageCircle } from 'lucide-react'
import { Product, ProductCategory } from '@/lib/types'
import { getProducts, createOrder, logActivity, notifyDiscord, getPaymentMethods, getSetting, getRates, getMetodosPago } from '@/lib/data'
import { formatUSD, cn } from '@/lib/utils'
import { PAISES, PAIS_INTERNACIONAL, paisPorCodigo, formatearLocal, adivinarPais } from '@/lib/paises'
import type { PaymentMethod } from '@/lib/types'
import type { MetodoPago } from '@/lib/data'
import PantallaPago from '@/components/store/PantallaPago'

const categoryConfig: Record<ProductCategory, { label: string; icon: any; color: string }> = {
  diamonds: { label: 'Diamantes', icon: Gem, color: '#e11d3c' },
  membership: { label: 'Membresías', icon: Crown, color: '#e8b33c' },
  bundle: { label: 'Bundles', icon: Package, color: '#ffd700' },
  pass: { label: 'Pases', icon: Ticket, color: '#ff6b6b' },
}

const FALLBACK_METHODS = ['Transferencia / PagoMóvil', 'Binance', 'PayPal', 'Zelle', 'Nequi']

type CartItem = { product: Product; qty: number }
type Cart = Record<string, CartItem>

export default function PagoStorePage() {
  // Arranca VACIO. Antes arrancaba con demoProducts, asi que cada carga
  // mostraba PRECIOS DE DEMOSTRACION antes de reemplazarlos por los reales:
  // un cliente rapido alcanzaba a leer una cifra que no existe.
  const [products, setProducts] = useState<Product[]>([])
  const [cargandoProductos, setCargandoProductos] = useState(true)
  const [activeCat, setActiveCat] = useState<ProductCategory>('diamonds')
  const [cart, setCart] = useState<Cart>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [success, setSuccess] = useState<string[] | null>(null)
  // El carrito se vacia al confirmar, asi que el total hay que
  // guardarlo antes o la pantalla de pago mostraria 0.
  const [ultimoTotal, setUltimoTotal] = useState(0)
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])
  const [form, setForm] = useState({ name: '', ffid: '', discord: '', method: FALLBACK_METHODS[0] })
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [country, setCountry] = useState<string>('ALL')
  const [rates, setRates] = useState<Record<string, number>>({})
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [whatsapp, setWhatsapp] = useState<string | null>(null)

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .finally(() => setCargandoProductos(false))
    getPaymentMethods().then(setMethods)
    getMetodosPago().then(setMetodosPago)
    getSetting('whatsapp_number').then(setWhatsapp)
    const saved = typeof window !== 'undefined' ? localStorage.getItem('store_country') : null
    // Sin eleccion previa, conjeturamos por zona horaria para que el
    // visitante vea SU moneda ya en el primer render.
    setCountry(saved || adivinarPais())
  }, [])

  // Registrar que el usuario entro a la tienda (una vez por carga)
  useEffect(() => {
    logActivity('store_view')
  }, [])

  // Antes el desplegable se armaba con los paises que tuvieran metodo de pago
  // cargado (tres), y solo Venezuela veia precio local. Ahora salen los ocho
  // donde vendes y todos ven su moneda.
  const pais = paisPorCodigo(country)
  const countries = [PAIS_INTERNACIONAL.code, ...PAISES.map((x) => x.code)]
  const COUNTRY_LABEL: Record<string, string> = Object.fromEntries(
    [PAIS_INTERNACIONAL, ...PAISES].map((x) => [x.code, x.nombre])
  )
  const currency = pais.moneda
  const methodsForCountry = methods.filter((m) => m.country === country || m.country === 'ALL')
  const methodNames = methodsForCountry.length ? methodsForCountry.map((m) => m.name) : FALLBACK_METHODS

  // Mantener el metodo de pago seleccionado dentro de los disponibles para el pais
  useEffect(() => {
    if (methodNames.length && !methodNames.includes(form.method)) {
      setForm((f) => ({ ...f, method: methodNames[0] }))
    }
  }, [methodNames, form.method])

  // Tasas en vivo de TODAS las monedas (Binance P2P, via Cloudflare Function).
  // Se piden una sola vez y valen para cualquier pais que elija el visitante:
  // asi cambiar de pais es instantaneo, sin otra vuelta a la red.
  useEffect(() => {
    let alive = true
    getRates()
      .then((r) => { if (alive) setRates(r) })
      .catch(() => { if (alive) setRates({}) })
    return () => { alive = false }
  }, [])

  const tasa = currency === 'USD' ? null : (rates[currency] ?? null)
  // Si la moneda del pais no tiene tasa, se muestra en USD. Nunca se inventa
  // una conversion: un precio local mal calculado se cobra mal.
  const fmt = (usd: number) => formatearLocal(usd, pais, tasa)

  const filtered = products.filter(
    (p) =>
      p.category === activeCat &&
      (search.trim() === '' || p.name.toLowerCase().includes(search.trim().toLowerCase()))
  )

  const cartCount = useMemo(() => Object.values(cart).reduce((s, i) => s + i.qty, 0), [cart])
  const cartTotal = useMemo(
    () => Object.values(cart).reduce((s, i) => s + i.qty * i.product.price_usd, 0),
    [cart]
  )

  const addToCart = (p: Product) => {
    setCart((prev) => ({
      ...prev,
      [p.id]: { product: p, qty: (prev[p.id]?.qty ?? 0) + 1 },
    }))
    logActivity('add_cart', { product: p.name })
    setDrawerOpen(true)
  }

  const setQty = (id: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev }
      if (qty <= 0) delete next[id]
      else next[id] = { ...next[id], qty }
      return next
    })
  }

  const finalize = async () => {
    setFormError('')
    if (!form.name.trim()) return setFormError('Ingresa tu nombre.')
    if (!form.ffid.trim()) return setFormError('Ingresa tu ID de Free Fire.')
    const items = Object.values(cart)
    if (items.length === 0) return setFormError('El carrito está vacío.')

    setSubmitting(true)
    setUltimoTotal(cartTotal)
    let ok = 0
    const orders: string[] = []
    for (const it of items) {
      const order_number = `ELITE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
      const { error } = await createOrder({
        order_number,
        customer_name: form.name.trim(),
        free_fire_id: form.ffid.trim(),
        customer_discord: form.discord.trim() || null,
        product_id: it.product.id,
        quantity: it.qty,
        total_usd: +(it.qty * it.product.price_usd).toFixed(2),
        payment_method: form.method,
        // Se deja constancia del pais y del precio LOCAL que vio el cliente:
        // la tasa se mueve, y a la hora de cobrar hay que respetar lo pactado.
        notes: `${it.qty}x ${it.product.name} · ${pais.nombre} · ${fmt(it.qty * it.product.price_usd)}`,
      })
      if (!error) {
        ok++
        orders.push(order_number)
      }
    }
    await logActivity('purchase', {
      customer: form.name.trim(),
      ffid: form.ffid.trim(),
      method: form.method,
      total: +cartTotal.toFixed(2),
      orders,
    })
    await notifyDiscord({
      type: 'purchase',
      customer: form.name.trim(),
      ffid: form.ffid.trim(),
      method: form.method,
      total: +cartTotal.toFixed(2),
      // Lo que de verdad necesitas para atenderlo: de donde es y cuanto paga
      // en SU moneda. Con el total en dolares hay que hacer la cuenta a mano.
      pais: pais.nombre,
      total_local: currency === 'USD' ? null : fmt(cartTotal),
      moneda: currency,
      whatsapp: form.discord.trim() || null,
      orders,
    })
    setSubmitting(false)
    if (ok > 0) {
      setSuccess(orders)
      setCart({})
    } else {
      setFormError('No se pudo enviar el pedido. Inténtalo de nuevo o contáctanos por Discord.')
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-24">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-elite-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      <div className="section-container">
        <motion.div initial={{ y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-primary/10 border border-elite-primary/30 mb-4">
            <ShoppingCart className="w-4 h-4 text-elite-primary" />
            <span className="text-sm font-medium text-elite-primary">PAGOSTORE PREMIUM</span>
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl gradient-text mb-2">Tienda de Diamantes</h1>
          <p className="text-white/60">Entrega automática por el bot • Mejor precio • Soporte 24/7</p>
        </motion.div>

        <div className="flex flex-wrap justify-center items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 rounded-xl border border-elite-border px-3 py-2 bg-elite-card">
            <span className="text-white/50 text-sm">País:</span>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value)
                if (typeof window !== 'undefined') localStorage.setItem('store_country', e.target.value)
              }}
              className="bg-transparent text-sm font-bold text-white focus:outline-none"
            >
              {countries.map((c) => (
                <option key={c} value={c} className="bg-elite-dark">
                  {COUNTRY_LABEL[c] ?? c}
                </option>
              ))}
            </select>
          </div>
          {/* La tasa se muestra siempre: el visitante tiene derecho a saber de
              donde sale el numero que va a pagar. */}
          {currency !== 'USD' && (
            <span className="text-white/50 text-xs">
              {tasa
                ? `1 USDT ≈ ${pais.simbolo} ${tasa.toLocaleString(pais.locale, { maximumFractionDigits: 2 })} · Binance P2P`
                : 'Sin tasa disponible · precios en USD'}
            </span>
          )}
          {currency === 'USD' && (
            <span className="text-white/50 text-xs">Precios en USD</span>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {(Object.keys(categoryConfig) as ProductCategory[]).map((cat) => {
            const cfg = categoryConfig[cat]
            const Icon = cfg.icon
            return (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all',
                  activeCat === cat
                    ? 'bg-gradient-to-r from-elite-primary to-elite-secondary text-white shadow-lg shadow-elite-primary/25'
                    : 'bg-elite-card border border-elite-border text-white/70 hover:border-elite-primary/50'
                )}
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
              </button>
            )
          })}
        </div>

        <div className="flex justify-center mb-8">
          <input
            className="input max-w-md w-full"
            placeholder="🔍 Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Cargando: esqueletos, no precios inventados. */}
        {cargandoProductos && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-glow h-52 animate-pulse bg-elite-card/40" />
            ))}
          </div>
        )}

        {/* Sin conexion o catalogo vacio: se dice, no se disimula. */}
        {!cargandoProductos && products.length === 0 && (
          <div className="card-glow p-10 text-center">
            <p className="font-display text-2xl mb-2">Tienda temporalmente no disponible</p>
            <p className="text-white/60 mb-6">
              No pudimos cargar el catálogo. Los precios cambian a diario, así que
              preferimos no mostrarte cifras que podrían estar mal.
            </p>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-block"
              >
                Escríbenos por WhatsApp
              </a>
            )}
          </div>
        )}

        {!cargandoProductos && products.length > 0 && filtered.length === 0 && (
          <p className="text-white/50 py-10 text-center">
            Nada coincide con esa búsqueda.
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((product, i) => {
            const enCarrito = cart[product.id]?.qty ?? 0
            const precio = product.discount_percent > 0
              ? product.price_usd * (1 - product.discount_percent / 100)
              : product.price_usd
            return (
              <motion.button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                aria-label={`Agregar ${product.name}`}
                className="card relative overflow-hidden p-3.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-elite-primary"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* TODA la baldosa es el boton. Antes cada producto llevaba un
                    boton "Agregar" a todo el ancho dentro de una tarjeta con
                    128 px solo de icono: ocupaba una pantalla entera para
                    enseñar cuatro precios. */}
                {product.is_featured && (
                  <span className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-elite-gold/15 text-elite-gold border border-elite-gold/30">
                    TOP
                  </span>
                )}
                {product.discount_percent > 0 && (
                  <span className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-bold bg-elite-primary/20 text-elite-primary border border-elite-primary/40">
                    -{product.discount_percent}%
                  </span>
                )}

                <div className="flex items-baseline gap-1.5 mt-3 mb-0.5">
                  <span className="font-display font-bold text-2xl leading-none tabular-nums">
                    {product.diamonds_amount
                      ? product.diamonds_amount.toLocaleString('es')
                      : product.name}
                  </span>
                  {!!product.diamonds_amount && <span className="text-base leading-none">💎</span>}
                </div>
                {!!product.diamonds_amount && (
                  <p className="text-[11px] text-white/35 truncate mb-2.5">{product.name}</p>
                )}

                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    {product.discount_percent > 0 && (
                      <span className="block text-[11px] text-white/30 line-through leading-none">
                        {fmt(product.price_usd)}
                      </span>
                    )}
                    <span className="font-mono tabular-nums font-semibold text-elite-primary text-[15px] leading-tight break-all">
                      {fmt(precio)}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold tabular-nums transition-colors ${
                      enCarrito
                        ? 'bg-elite-primary text-white'
                        : 'bg-white/[0.07] text-white/45 group-hover:bg-elite-primary group-hover:text-white'
                    }`}
                  >
                    {enCarrito || <Plus className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </motion.button>
            )
          })}
        </div>

        <div className="mt-12 card-glow p-6 text-center">
          <p className="text-white/60 text-sm mb-4">
            🔒 Pago 100% seguro • Entrega en 5-15 min • Soporte Discord 24/7
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {methodNames.map((m) => (
              <span key={m} className="px-3 py-1 rounded-full bg-elite-card border border-elite-border text-white/70 text-xs">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Botón flotante del carrito */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-elite-primary to-elite-secondary shadow-lg shadow-elite-primary/40 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Carrito"
      >
        <ShoppingCart className="w-6 h-6 text-white" />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-elite-gold text-black text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
            {cartCount}
          </span>
        )}
      </button>

      {/* Drawer del carrito / checkout */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-elite-dark border-l border-elite-border p-6 overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display font-bold text-2xl gradient-text flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" /> Tu Carrito
                </h2>
                <button onClick={() => setDrawerOpen(false)} className="text-white/60 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {Object.keys(cart).length === 0 ? (
                <p className="text-white/40 text-center mt-20">Tu carrito está vacío.</p>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {Object.values(cart).map(({ product, qty }) => (
                      <div key={product.id} className="card-glow p-3 flex items-center gap-3">
                        <div className="flex-1">
                           <p className="font-medium">{product.name}</p>
                           <p className="text-elite-primary text-sm">{fmt(product.price_usd)} c/u</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setQty(product.id, qty - 1)} className="w-7 h-7 rounded bg-elite-card border border-elite-border flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                          <span className="w-6 text-center">{qty}</span>
                          <button onClick={() => setQty(product.id, qty + 1)} className="w-7 h-7 rounded bg-elite-card border border-elite-border flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                        </div>
                        <button onClick={() => setQty(product.id, 0)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>

                  <div className="text-right font-display font-bold text-xl mb-4">
                    Total: <span className="gradient-text">{fmt(cartTotal)}</span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <input className="input" placeholder="Tu nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <input className="input" placeholder="ID de Free Fire *" value={form.ffid} onChange={(e) => setForm({ ...form, ffid: e.target.value })} />
                    <input className="input" placeholder="Discord (opcional)" value={form.discord} onChange={(e) => setForm({ ...form, discord: e.target.value })} />
                    <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                      {methodNames.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {formError && <p className="text-red-400 text-sm mb-3">{formError}</p>}

                  <button onClick={finalize} disabled={submitting} className="btn-primary w-full justify-center">
                    {submitting ? 'Enviando…' : 'Finalizar compra'} <Zap className="w-4 h-4" />
                  </button>
                  <p className="text-white/40 text-xs mt-3 text-center">
                    Al finalizar recibirás un número de pedido. Te contactamos por Discord para coordinar el pago y entrega.
                  </p>
                </>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* PANTALLA DE PAGO. Antes aqui salia "pedido recibido, te avisamos
          por Discord": el cliente se quedaba con un numero y sin saber donde
          pagar, asi que tenia que irse a WhatsApp a preguntar. Cada paso extra
          en ese momento es una venta que se cae. */}
      <AnimatePresence>
        {success && (
          <PantallaPago
            pedidos={success}
            totalUSD={ultimoTotal}
            totalLocal={currency === 'USD' ? null : fmt(ultimoTotal)}
            pais={pais}
            metodos={metodosPago}
            metodoElegido={form.method}
            whatsapp={whatsapp}
            onCerrar={() => setSuccess(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
