'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Gem, ShoppingCart, Zap, Crown, Star, Package, Ticket } from 'lucide-react'
import { Product, ProductCategory } from '@/lib/types'
import { getProducts } from '@/lib/data'
import { demoProducts } from '@/lib/demo-data'
import { formatUSD, cn } from '@/lib/utils'

const categoryConfig: Record<ProductCategory, { label: string; icon: any; color: string }> = {
  diamonds: { label: 'Diamantes', icon: Gem, color: '#00d4ff' },
  membership: { label: 'Membresías', icon: Crown, color: '#7c3aed' },
  bundle: { label: 'Bundles', icon: Package, color: '#ffd700' },
  pass: { label: 'Pases', icon: Ticket, color: '#ff6b6b' },
}

export default function PagoStorePage() {
  const [products, setProducts] = useState<Product[]>(demoProducts)
  const [activeCat, setActiveCat] = useState<ProductCategory>('diamonds')

  useEffect(() => {
    getProducts().then(setProducts)
  }, [])

  const filtered = products.filter((p) => p.category === activeCat)

  return (
    <div className="min-h-screen pt-24 pb-16">
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
          <p className="text-white/60">Entrega instantánea • Mejor precio • Soporte 24/7</p>
        </motion.div>

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
                  {categoryConfig[product.category].icon && 
                    (() => {
                      const Icon = categoryConfig[product.category].icon
                      return <Icon className="w-10 h-10 text-elite-primary" />
                    })()
                  }
                </div>
              </div>

              <h3 className="font-display font-bold text-lg text-center mb-2">{product.name}</h3>
              {(product.diamonds_amount ?? 0) > 0 && (
                <p className="text-center text-white/50 text-sm mb-4">{product.diamonds_amount} 💎</p>
              )}

              <div className="text-center mb-4">
                {product.discount_percent > 0 ? (
                  <div>
                    <span className="text-white/40 line-through text-sm mr-2">{formatUSD(product.price_usd)}</span>
                    <span className="font-display font-bold text-2xl gradient-text">
                      {formatUSD(product.price_usd * (1 - product.discount_percent / 100))}
                    </span>
                  </div>
                ) : (
                  <span className="font-display font-bold text-2xl gradient-text">{formatUSD(product.price_usd)}</span>
                )}
              </div>

              <button className="btn-primary w-full justify-center group/btn">
                <ShoppingCart className="w-4 h-4" />
                Comprar
                <Zap className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 card-glow p-6 text-center">
          <p className="text-white/60 text-sm">
            🔒 Pago 100% seguro • Entrega en 5-15 min • Soporte Discord 24/7
          </p>
        </div>
      </div>
    </div>
  )
}
