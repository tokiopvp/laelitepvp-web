'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gem, ShoppingCart, Zap, Crown, Star, Package, Ticket, X, Plus, Minus, CheckCircle2, Trash2, Activity, MessageCircle } from 'lucide-react'
import { Product, ProductCategory } from '@/lib/types'
import { getProducts, createOrder, logActivity, notifyDiscord, getPaymentMethods, getSetting } from '@/lib/data'
import { demoProducts } from '@/lib/demo-data'
import { formatUSD, cn } from '@/lib/utils'
import type { PaymentMethod } from '@/lib/types'

const categoryConfig: Record<ProductCategory, { label: string; icon: any; color: string }> = {
  diamonds: { label: 'Diamantes', icon: Gem, color: '#00d4ff' },
  membership: { label: 'Membresías', icon: Crown, color: '#7c3aed' },
  bundle: { label: 'Bundles', icon: Package, color: '#ffd700' },
  pass: { label: 'Pases', icon: Ticket, color: '#ff6b6b' },
}

const FALLBACK_METHODS = ['Transferencia / PagoMóvil', 'Binance', 'PayPal', 'Zelle', 'Nequi']

type CartItem = { product: Product; qty: number }
type Cart = Record<string, CartItem>

export default function PagoStorePage() {
  const [products, setProducts] = useState<Product[]>(demoProducts)
  const [activeCat, setActiveCat] = useState<ProductCategory>('diamonds')
  const [cart, setCart] = useState<Cart>({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', ffid: '', discord: '', method: FALLBACK_METHODS[0] })
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD')
  const [vesRate, setVesRate] = useState<number | null>(null)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [whatsapp, setWhatsapp] = useState<string | null>(null)

  useEffect(() => {
    getProducts().then(setProducts)
    getPaymentMethods().then(setMethods)
    getSetting('whatsapp_number').then(setWhatsapp)
  }, [])

  // Registrar que el usuario entro a la tienda (una vez por carga)
  useEffect(() => {
    logActivity('store_view')
  }, [])

  // Tipo de cambio VES en vivo (Binance P2P)
  useEffect(() => {
    if (currency !== 'VES') return
    let alive = true
    fetch('/api/ves-rate')
      .then((r) => r.json())
      .then((j) => { if (alive) setVesRate(j.rate ?? null) })
      .catch(() => { if (alive) setVesRate(null) })
    return () => { alive = false }
  }, [currency])

  const methodNames = methods.length ? methods.map((m) => m.name) : FALLBACK_METHODS
  const fmt = (usd: number) => {
    if (currency === 'VES' && vesRate) {
      return `Bs.S ${(usd * vesRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}`
    }
    return formatUSD(usd)
  }

  // Registrar que el usuario entró a la tienda (una vez por carga)
  useEffect(() => {
    logActivity('store_view')
  }, [])

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
        notes: `${it.qty}x ${it.product.name}`,
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
      orders,
    })
    setSubmitting(false)
    if (ok > 0) {
      setSuccess(orders.join(', '))
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
          <div className="inline-flex rounded-xl border border-elite-border overflow-hidden">
            {(['USD', 'VES'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={currency === c ? 'px-4 py-2 text-sm font-bold bg-gradient-to-r from-elite-primary to-elite-secondary text-white' : 'px-4 py-2 text-sm text-white/70 hover:text-white'}
              >
                {c === 'USD' ? 'USD $' : 'VES Bs.S'}
              </button>
            ))}
          </div>
          {currency === 'VES' && (
            <span className="text-white/50 text-xs">
              {vesRate ? `1 USDT ≈ Bs.S ${vesRate.toLocaleString('es-VE')} (Binance P2P)` : 'cargando tasa…'}
            </span>
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product, i) => (
            <motion.div
              key={product.id}
              className="card-glow p-6 group relative overflow-hidden"
              initial={{ y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5 }}
            >
              {product.discount_percent > 0 && (
                <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-bold">
                  -{product.discount_percent}%
                </div>
              )}
              {product.is_featured && (
                <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-elite-gold/20 border border-elite-gold/50 text-elite-gold text-xs font-bold flex items-center gap-1">
                  <Star className="w-3 h-3" /> TOP
                </div>
              )}

              <div className="flex items-center justify-center h-32 mb-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-elite-primary/20 to-elite-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {(() => {
                    const Icon = categoryConfig[product.category].icon
                    return <Icon className="w-10 h-10 text-elite-primary" />
                  })()}
                </div>
              </div>

              <h3 className="font-display font-bold text-lg text-center mb-2">{product.name}</h3>
              {(product.diamonds_amount ?? 0) > 0 && (
                <p className="text-center text-white/50 text-sm mb-4">{product.diamonds_amount} 💎</p>
              )}

                  <div className="text-center mb-4">
                    {product.discount_percent > 0 ? (
                      <div>
                        <span className="text-white/40 line-through text-sm mr-2">{fmt(product.price_usd)}</span>
                        <span className="font-display font-bold text-2xl gradient-text">
                          {fmt(product.price_usd * (1 - product.discount_percent / 100))}
                        </span>
                      </div>
                    ) : (
                      <span className="font-display font-bold text-2xl gradient-text">{fmt(product.price_usd)}</span>
                    )}
                  </div>

              <button onClick={() => addToCart(product)} className="btn-primary w-full justify-center group/btn">
                <ShoppingCart className="w-4 h-4" />
                Agregar
                <Plus className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />
              </button>
            </motion.div>
          ))}
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

      {/* Modal de éxito */}
      <AnimatePresence>
        {success && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="card-premium p-8 max-w-md text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-elite-gold" />
              <h3 className="font-display font-bold text-2xl gradient-text mb-2">¡Pedido recibido!</h3>
              <p className="text-white/70 mb-4">
                Guardamos tu pedido y te avisamos por Discord para confirmar el pago y entregar tus diamantes.
              </p>
              <p className="text-sm text-white/50 mb-6">N°: <span className="text-elite-primary">{success}</span></p>
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary w-full justify-center mb-3"
                >
                  <MessageCircle className="w-4 h-4" /> Soporte por WhatsApp
                </a>
              )}
              <button onClick={() => setSuccess(null)} className="btn-primary w-full justify-center">Listo</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
