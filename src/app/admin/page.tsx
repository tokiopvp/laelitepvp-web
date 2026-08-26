'use client'

import { motion } from 'framer-motion'
import { Users, Trophy, Gem, FileText, Settings, Shield, LogOut, Lock, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/auth/AuthProvider'

const adminCards = [
  { href: '/admin/miembros', label: 'Miembros', icon: Users, desc: 'Gestionar squad oficial' },
  { href: '/admin/tops', label: 'Tops & Rankings', icon: Trophy, desc: 'Recalcular posiciones' },
  { href: '/admin/torneos', label: 'Torneos', icon: Shield, desc: 'Añadir victorias' },
  { href: '/admin/productos', label: 'PagoStore', icon: Gem, desc: 'Catálogo diamantes' },
  { href: '/admin/pedidos', label: 'Pedidos', icon: FileText, desc: 'Estado de ventas' },
  { href: '/admin/postulaciones', label: 'Postulaciones', icon: UserPlus, desc: 'Solicitudes de ingreso' },
  { href: '/admin/noticias', label: 'Noticias', icon: FileText, desc: 'Publicar anuncios' },
]

export default function AdminPage() {
  const { user, role, loading, isAuthed, signIn, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <p className="text-white/60 font-display text-lg gradient-text">Cargando...</p>
      </div>
    )
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <motion.div
          className="card-glow p-10 text-center max-w-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Lock className="w-14 h-14 text-elite-primary mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl gradient-text mb-2">Acceso Restringido</h1>
          <p className="text-white/60 text-sm mb-6">Iniciá sesión con Discord para acceder al panel.</p>
          <button onClick={signIn} className="btn-primary w-full justify-center group">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.213.382-.46.898-.63 1.307a18.27 18.27 0 0 0-5.51 0A12.6 12.6 0 0 0 9.11 3 19.74 19.74 0 0 0 4.677 4.37C1.83 8.59 1.05 12.7 1.47 16.75a19.9 19.9 0 0 0 6.04 3.04c.49-.66.927-1.36 1.302-2.096-.716-.27-1.4-.6-2.043-.998.171-.125.338-.256.5-.39a14.2 14.2 0 0 0 12.142 0c.164.136.33.267.5.39-.644.4-1.327.73-2.044.999.375.736.81 1.436 1.302 2.096a19.86 19.86 0 0 0 6.046-3.04c.47-4.67-.787-8.74-3.135-12.381ZM8.52 14.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm6.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z" />
            </svg>
            Entrar con Discord
          </button>
        </motion.div>
      </div>
    )
  }

  if (role !== 'owner' && role !== 'admin' && role !== 'moderator' && role !== 'editor') {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <motion.div
          className="card-glow p-10 text-center max-w-sm"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Lock className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h1 className="font-display font-bold text-2xl mb-2">Sin permisos</h1>
          <p className="text-white/60 text-sm mb-6">Tu cuenta de Discord no tiene rol de staff. Contactá al owner.</p>
          <button onClick={signOut} className="btn-secondary w-full justify-center">Cerrar sesión</button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-12 flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-gold/10 border border-elite-gold/30 mb-4">
              <Settings className="w-4 h-4 text-elite-gold" />
              <span className="text-sm font-medium text-elite-gold">PANEL ADMIN · {role?.toUpperCase()}</span>
            </div>
            <h1 className="font-display font-bold text-4xl gradient-text mb-2">Panel de Control</h1>
            <p className="text-white/60">Bienvenido, {user?.user_metadata?.full_name || user?.email}</p>
          </div>
          <button onClick={signOut} className="btn-secondary inline-flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Salir
          </button>
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
