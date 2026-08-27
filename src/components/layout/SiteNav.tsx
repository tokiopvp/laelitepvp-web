'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

const links = [
  { href: '/', label: 'Inicio' },
  { href: '/miembros', label: 'Miembros' },
  { href: '/tops', label: 'Tops' },
  { href: '/torneos', label: 'Torneos' },
  { href: '/comunidad', label: 'Comunidad' },
  { href: '/pagostore', label: 'PagoStore' },
  { href: '/noticias', label: 'Noticias' },
]

export default function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { isAuthed, role } = useAuth()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-elite-dark/80 backdrop-blur-2xl border-b border-elite-border">
      <div className="section-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-3" aria-label="La Elite PvP">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-elite-primary to-elite-secondary flex items-center justify-center">
                {/* El emblema del clan, no la corona generica de lucide. */}
                <img src="/icon-192.png" alt="" width={28} height={28} className="w-7 h-7" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-elite-gold rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>
            <span className="font-display font-bold text-xl gradient-text">La Elite PvP</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative px-4 py-2 rounded-lg font-medium transition-colors ${
                  isActive(l.href)
                    ? 'text-elite-primary'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {l.label}
                {isActive(l.href) && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-elite-primary to-elite-secondary"
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/unirse" className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2">
              Unirse
            </Link>
            {isAuthed && (
              <Link
                href={role && role !== 'member' ? '/admin' : '/mi'}
                className="text-white/70 hover:text-elite-primary text-sm font-medium transition-colors"
              >
                {role && role !== 'member' ? 'Panel' : 'Mi cuenta'}
              </Link>
            )}
            {!isAuthed && (
              <Link href="/admin" className="text-white/40 hover:text-white text-sm transition-colors">
                Staff
              </Link>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-elite-card transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Menú"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-elite-dark/95 border-t border-elite-border"
          >
            <div className="section-container py-4 flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`px-4 py-3 rounded-lg font-medium ${
                    isActive(l.href) ? 'bg-elite-primary/10 text-elite-primary' : 'text-white/80'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/unirse"
                onClick={() => setOpen(false)}
                className="btn-primary mt-2 justify-center"
              >
                Unirse al Clan
              </Link>
              {isAuthed && (
                <Link
                  href={role && role !== 'member' ? '/admin' : '/mi'}
                  onClick={() => setOpen(false)}
                  className="text-center text-white/70 py-3"
                >
                  {role && role !== 'member' ? 'Panel' : 'Mi cuenta'}
                </Link>
              )}
              {!isAuthed && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="text-center text-white/50 py-3"
                >
                  Acceso Staff
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
