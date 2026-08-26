'use client'

import { motion } from 'framer-motion'
import { Users, Trophy, Gem, FileText, Settings, Shield } from 'lucide-react'
import Link from 'next/link'

const adminCards = [
  { href: '/admin/miembros', label: 'Miembros', icon: Users, desc: 'Gestionar squad oficial' },
  { href: '/admin/tops', label: 'Tops & Rankings', icon: Trophy, desc: 'Recalcular posiciones' },
  { href: '/admin/torneos', label: 'Torneos', icon: Shield, desc: 'Añadir victorias' },
  { href: '/admin/productos', label: 'PagoStore', icon: Gem, desc: 'Catálogo diamantes' },
  { href: '/admin/pedidos', label: 'Pedidos', icon: FileText, desc: 'Estado de ventas' },
  { href: '/admin/noticias', label: 'Noticias', icon: FileText, desc: 'Publicar anuncios' },
]

export default function AdminPage() {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-gold/10 border border-elite-gold/30 mb-4">
            <Settings className="w-4 h-4 text-elite-gold" />
            <span className="text-sm font-medium text-elite-gold">PANEL ADMIN</span>
          </div>
          <h1 className="font-display font-bold text-4xl gradient-text mb-2">Panel de Control</h1>
          <p className="text-white/60">Gestión del clan La Elite PvP.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminCards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.href}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -5 }}
              >
                <Link href={card.href} className="card-glow p-6 block group">
                  <Icon className="w-10 h-10 text-elite-primary mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="font-display font-bold text-xl mb-1">{card.label}</h3>
                  <p className="text-white/50 text-sm">{card.desc}</p>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
