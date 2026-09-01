'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Gem, ShoppingCart, Zap, Crown, Star, Package, Ticket, X, Plus, Minus, CheckCircle2, Trash2, Activity, MessageCircle, Coins, ArrowRight } from 'lucide-react'
import { Product, ProductCategory } from '@/lib/types'
import { getProducts, createOrder, logActivity, notifyDiscord, getPaymentMethods, getSetting, getRates, getMetodosPago } from '@/lib/data'
import { formatUSD, cn } from '@/lib/utils'
import { PAISES, PAIS_INTERNACIONAL, paisPorCodigo, formatearLocal, adivinarPais, banderaDe } from '@/lib/paises'
import type { PaymentMethod } from '@/lib/types'
import type { MetodoPago } from '@/lib/data'
import PantallaPago from '@/components/store/PantallaPago'
import { WHATSAPP, enlaceWhatsApp } from '@/lib/contacto'
import PedidosPendientes from '@/components/store/PedidosPendientes'
import Resplandor from '@/components/layout/Resplandor'
import PuenteEliteCoin from '@/components/store/PuenteEliteCoin'
import CompraCoins from '@/components/store/CompraCoins'
import {
  guardarCarrito, leerCarrito, reconstruirCarrito,
  agregarPendientes, guardarDatos, leerDatos,
  type PedidoPendiente,
} from '@/lib/carrito'

const categoryConfig: Record<ProductCategory, { label: string; icon: any; color: string }> = {
  diamonds: { label: 'Diamantes', icon: Gem, color: '#5b9dff' },
  membership: { label: 'Membresías', icon: Crown, color: '#f0b429' },
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
  const [cart, setCart] = useState<Cart>({})
  const rehidratado = useRef(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [success, setSuccess] = useState<string[] | null>(null)
  // El carrito se vacia al confirmar, asi que el total hay que
  // guardarlo antes o la pantalla de pago mostraria 0.
  const [ultimoTotal, setUltimoTotal] = useState(0)
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([])
  const [form, setForm] = useState({ name: '', ffid: '', discord: '', method: FALLBACK_METHODS[0] })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [country, setCountry] = useState<string>('ALL')
  const [rates, setRates] = useState<Record<string, number>>({})
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  // Respaldo con el numero del clan: si el ajuste no esta guardado, el
  // cliente sigue teniendo por donde escribir. Antes se quedaba sin boton.
  const [whatsapp, setWhatsapp] = useState<string>(WHATSAPP)

  useEffect(() => {
    getProducts()
      .then((ps) => {
        setProducts(ps)
        // El carrito se rehidrata contra el catalogo RECIEN cargado, nunca con
        // los precios que quedaron guardados: cambian a diario y cobrar uno
        // viejo porque estaba en el navegador del cliente seria un error caro.
        const guardado = leerCarrito()
        if (guardado.length > 0) {
          const { carrito } = reconstruirCarrito(guardado, ps)
          if (Object.keys(carrito).length > 0) setCart(carrito)
        }
      })
      .finally(() => {
        setCargandoProductos(false)
        // A partir de aqui el carrito en pantalla ya refleja lo guardado, asi
        // que guardarlo es seguro. Se levanta tambien si el catalogo fallo:
        // sin catalogo no hay nada que añadir, y no debe quedarse bloqueado.
        rehidratado.current = true
      })
    // Nombre e ID de Free Fire del cliente habitual: teclear 9 cifras desde el
    // movil es donde mas gente abandona.
    const datos = leerDatos()
    if (datos) setForm((f) => ({ ...f, name: datos.name, ffid: datos.ffid, discord: datos.discord }))
    getPaymentMethods().then(setMethods)
    getMetodosPago().then(setMetodosPago)
    getSetting('whatsapp_number').then((v) => { if (v && v.trim()) setWhatsapp(v.trim()) })
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
  /**
   * Métodos de pago del país. UNA sola fuente.
   *
   * Antes había DOS listas en paralelo: la tabla `payment_methods` -que
   * alimentaba este desplegable y solo tenía los cinco métodos originales- y
   * `pagos_json`, que es la que mantiene el bot y donde viven Yape, Plin, MACH,
   * BBVA y Mercado Pago. Resultado: un peruano llegaba a la pantalla de pago y
   * veía Yape y Plin, pero en el formulario solo podía elegir entre Binance y
   * PayPal. Elegía uno que no iba a usar, y el pedido salía con el método
   * equivocado.
   *
   * Ahora manda `pagos_json`, que es la que está al día. La tabla queda como
   * respaldo por si esa lista viniera vacía.
   */
  const metodosDelPais = metodosPago.filter(
    (m) => m.paises.length === 0 || m.paises.includes(country)
  )
  const methodNames = metodosDelPais.length
    ? metodosDelPais.map((m) => m.nombre)
    : methods.filter((m) => m.country === country || m.country === 'ALL').map((m) => m.name)
          .concat(FALLBACK_METHODS).slice(0, 6)

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

  /**
   * Precio de UN producto, respetando el precio cerrado del país si lo tiene.
   *
   * `fmt` sigue existiendo para totales y sumas, donde no hay un producto
   * concreto del que sacar el precio fijo.
   */
  const precioLocal = (p: Product, cantidad = 1) => {
    const fijo = p.precios_locales?.[pais.code]
    return formatearLocal(
      p.price_usd * cantidad,
      pais,
      tasa,
      fijo != null ? fijo * cantidad : null
    )
  }

  /** El importe numérico que se cobra de verdad, para totales y avisos. */
  const importe = (p: Product, cantidad = 1) => {
    const fijo = p.precios_locales?.[pais.code]
    if (fijo != null && tasa) return (fijo * cantidad) / tasa   // vuelta a USD
    return p.price_usd * cantidad
  }

  // Aqui solo se venden diamantes. Las pestañas de categoria y el buscador
  // ocupaban media pantalla para filtrar sobre una sola categoria con siete
  // productos: no elegian nada y empujaban el catalogo por debajo del pliegue.
  //
  // Se sigue filtrando por categoria en el DATO -no en la interfaz- por si en
  // el panel se crea algo que no es una recarga: no debe colarse en la tienda.
  //
  // ORDEN: de menor a mayor. La base los trae como caigan y los packs
  // llegaban barajados (6160 antes que 341): una tienda lee de abajo a arriba
  // la escalera de precios, y desordenada parece rota.
  const filtered = products
    .filter((p) => p.category === 'diamonds')
    .sort((a, b) => (a.diamonds_amount ?? 0) - (b.diamonds_amount ?? 0))

  // Cada cambio del carrito se guarda: recargar, tocar atras o que el movil
  // descargue la pestaña ya no vacia la compra.
  //
  // El guardia importa. Sin el, este efecto corre en el PRIMER render -cuando
  // el carrito todavia esta vacio porque el catalogo no ha llegado- y borra lo
  // guardado justo antes de poder recuperarlo. El sintoma es cruel: parece que
  // la persistencia no existe.
  useEffect(() => {
    if (!rehidratado.current) return
    guardarCarrito(
      Object.values(cart).map(({ product, qty }) => ({
        id: product.id, qty, nombre: product.name, precio: product.price_usd,
      }))
    )
  }, [cart])

  const cartCount = useMemo(() => Object.values(cart).reduce((s, i) => s + i.qty, 0), [cart])
  /**
   * Total en la moneda del país, sumando producto a producto.
   *
   * No se puede convertir el total en dólares: si un producto tiene precio
   * cerrado en soles y otro no, la conversión del conjunto daría un importe
   * que no coincide con lo que el cliente vio sumado en pantalla.
   */
  const totalLocalTexto = () => {
    if (currency === 'USD' || !tasa) return null
    const suma = Object.values(cart).reduce((a, it) => {
      const fijo = it.product.precios_locales?.[pais.code]
      return a + (fijo != null ? fijo * it.qty : it.product.price_usd * it.qty * tasa)
    }, 0)
    return formatearLocal(0, pais, tasa, suma)
  }

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
    const pendientes: PedidoPendiente[] = []
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
        notes: `${it.qty}x ${it.product.name} · ${pais.nombre} · ${precioLocal(it.product, it.qty)}`,
      })
      if (!error) {
        ok++
        orders.push(order_number)
        // Se guarda lo justo para reconocerlo al volver: que compro, cuanto y
        // con que referencia. Ningun dato sensible.
        pendientes.push({
          referencia: order_number,
          creado: Date.now(),
          totalUSD: +(it.qty * it.product.price_usd).toFixed(2),
          totalLocal: currency === 'USD' ? null : precioLocal(it.product, it.qty),
          metodo: form.method,
          detalle: `${it.qty}x ${it.product.name}`,
          estado: 'pending',
        })
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
      total_local: totalLocalTexto(),
      moneda: currency,
      whatsapp: form.discord.trim() || null,
      // Que compro exactamente: sin esto hay que abrir el panel para saber
      // cuantos diamantes hay que mandar, que es el dato que urge.
      detalle: items.map((it) => `${it.qty}x ${it.product.name}`).join(' · '),
      orders,
    })
    setSubmitting(false)
    if (ok > 0) {
      setSuccess(orders)
      setCart({})
      // El carrito se vacia, pero la compra NO desaparece: queda como pendiente
      // para que al volver pueda mandar su comprobante sin explicar nada.
      agregarPendientes(pendientes)
      guardarDatos({ name: form.name.trim(), ffid: form.ffid.trim(), discord: form.discord.trim() })
    } else {
      setFormError('No se pudo enviar el pedido. Inténtalo de nuevo o contáctanos por Discord.')
    }
  }

  return (
    <div className="min-h-screen pt-24 pb-24">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Resplandor className="top-1/4 left-1/4 w-96 h-96" color="#5b9dff" />
      </div>

      <div className="section-container">
        <motion.div initial={{ y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <h1 className="font-display font-bold text-3xl sm:text-4xl gradient-text mb-1">Tienda de Diamantes</h1>
          <p className="text-white/50 text-sm">Entrega rápida • Mejor precio • Soporte 24/7</p>
        </motion.div>

        {/* Una sola fila: bandera, país y la tasa. Es todo lo que hay que
            elegir aquí, porque lo único que se vende son diamantes. */}
        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-2 mb-6 text-sm">
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-elite-border px-2.5 py-1.5 bg-elite-card">
            <span className="text-base leading-none" aria-hidden>{banderaDe(pais.code)}</span>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value)
                if (typeof window !== 'undefined') localStorage.setItem('store_country', e.target.value)
              }}
              className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
              aria-label="Elige tu país"
            >
              {countries.map((c) => (
                <option key={c} value={c} className="bg-elite-dark">
                  {banderaDe(c)}  {COUNTRY_LABEL[c] ?? c}
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

        {/* Va ANTES del catalogo: quien vuelve con una compra a medias tiene
            que verla sin buscarla. Si no hay nada pendiente no ocupa espacio. */}
        <PedidosPendientes whatsapp={whatsapp} />

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
                href={enlaceWhatsApp('Hola, la tienda no carga. ¿Me ayudas con una compra?', whatsapp)}
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
                  {!!product.diamonds_amount && <span className="brillo-diamante text-base leading-none">💎</span>}
                </div>
                {!!product.diamonds_amount && (
                  <p className="text-[11px] text-white/35 truncate mb-2.5">{product.name}</p>
                )}

                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    {product.discount_percent > 0 && (
                      <span className="block text-[11px] text-white/30 line-through leading-none">
                        {precioLocal(product)}
                      </span>
                    )}
                    <span className="font-mono tabular-nums font-semibold text-elite-primary text-[15px] leading-tight break-all">
                      {precioLocal(product)}
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

        {/* Los packs de coins: lo segundo que vende la tienda. Va despues del
            catalogo de diamantes porque quien llega aqui viene por ellos; las
            coins son la compra impulsiva de quien ya esta con la tarjeta en la
            mano. */}
        <div className="mt-6">
          <CompraCoins />
        </div>

        {/* Los mismos diamantes, ganables jugando. Va aqui abajo y no
            arriba: primero el catalogo para quien viene a comprar. */}
        <PuenteEliteCoin />

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
                           <p className="text-elite-primary text-sm">{precioLocal(product)} c/u</p>
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
                    Total: <span className="gradient-text">{totalLocalTexto() ?? fmt(cartTotal)}</span>
                  </div>

                  {/* Aparece justo cuando alguien ya eligio lo que quiere: es
                      el momento en que enterarse de que existe otra via -jugar
                      en vez de pagar- de verdad cambia lo que hace despues. */}
                  <Link
                    href="/comunidad"
                    className="flex items-center gap-3 mb-4 rounded-xl border border-elite-gold/25 bg-elite-gold/[0.06] px-4 py-3 hover:bg-elite-gold/[0.1] transition-colors"
                  >
                    <Coins className="w-5 h-5 text-elite-gold shrink-0" />
                    <span className="text-xs text-white/70 leading-snug flex-1">
                      También puedes ganar esto <strong className="text-elite-gold">gratis</strong> con
                      Elite Coin, jugando en nuestro Discord.
                    </span>
                    <ArrowRight className="w-4 h-4 text-elite-gold shrink-0" />
                  </Link>

                  <div className="space-y-3 mb-4">
                    <input className="input" placeholder="Tu nombre *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <input className="input" placeholder="ID de Free Fire *" value={form.ffid} onChange={(e) => setForm({ ...form, ffid: e.target.value })} />
                    {/* Pide WHATSAPP, no Discord.
                        El campo se llamaba "Discord (opcional)", pero su valor
                        viaja como numero de WhatsApp al aviso de venta y es el
                        que usa el panel para escribirle al cliente. Quien
                        escribia "tokio#1234" quedaba ilocalizable justo cuando
                        habia que confirmarle el pago.
                        La columna sigue llamandose customer_discord por no
                        tocar la base con pedidos vivos dentro. */}
                    <input
                      className="input"
                      type="tel"
                      inputMode="tel"
                      placeholder="Tu WhatsApp (para avisarte)"
                      value={form.discord}
                      onChange={(e) => setForm({ ...form, discord: e.target.value })}
                    />
                    <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                      {methodNames.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {formError && <p className="text-red-400 text-sm mb-3">{formError}</p>}

                  <button onClick={finalize} disabled={submitting} className="btn-primary w-full justify-center">
                    {submitting ? 'Enviando…' : 'Finalizar compra'} <Zap className="w-4 h-4" />
                  </button>
                  <p className="text-white/40 text-xs mt-3 text-center">
                    Al finalizar verás los datos para pagar y tu número de pedido. Te escribimos por WhatsApp para confirmar la entrega.
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
