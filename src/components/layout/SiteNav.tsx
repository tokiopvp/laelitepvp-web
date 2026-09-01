'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronRight } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useGama } from '@/components/layout/Resplandor'

const links = [
  // ORDEN: segun la jerarquia que pide el dueño:
  // INICIO, ELITE COIN, MIEMBROS, RANKING, TIENDA, TOKIO IA, NOTICIAS
  // Comunidad es ELITE COIN y pagostore es TIENDA: las URLs se quedan como
  // estan para no romper enlaces viejos que ya circulan.
  { href: '/', label: 'INICIO' },
  // Elite Coin va el segundo: es lo unico del menu que el visitante puede
  // GANAR, y por eso lleva el unico tratamiento dorado de la barra.
  { href: '/comunidad', label: 'ELITE COIN', electrico: true },
  { href: '/miembros', label: 'MIEMBROS' },
  { href: '/tops', label: 'RANKING' },
  { href: '/pagostore', label: 'TIENDA' },
  { href: '/ia', label: 'TOKIO IA', destacado: true },
  { href: '/noticias', label: 'NOTICIAS' },
]

export default function SiteNav() {
  const { gama } = useGama()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { isAuthed, role } = useAuth()

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname.startsWith(href)

  return (
    <nav
      className={
        'fixed top-0 left-0 right-0 z-50 border-b border-elite-border ' +
        // El cristal esmerilado se paga en CADA fotograma de scroll: el
        // navegador tiene que desenfocar de nuevo todo lo que pasa por detras
        // de la barra. En una grafica dedicada es gratis; en una integrada es
        // lo que hace que desplazarse vaya a tirones en TODAS las paginas,
        // porque la barra esta siempre.
        //
        // Asi que el cristal es un lujo para quien puede pagarlo. Al resto se
        // le sirve un negro casi opaco: se lee igual de bien, tapa igual el
        // contenido de detras, y no cuesta nada.
        (gama === 'alto'
          ? 'bg-elite-dark/80 cristal'
          : 'bg-elite-dark/95')
      }
    >
      <div className="section-container">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link href="/" className="flex items-center gap-3" aria-label="La Elite PvP">
            <div className="relative">
              <img src="/icon-192.png" alt="La Elite PvP" width={40} height={40} className="w-10 h-10 rounded-xl object-cover" />
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-elite-gold rounded-full"
                animate={gama === 'bajo' ? undefined : { scale: [1, 1.3, 1] }}
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
                className={`relative px-3 py-2 rounded-lg font-display font-semibold text-sm tracking-wide transition-colors ${
                  (l as any).electrico
                    ? 'nav-electrico'
                    : isActive(l.href)
                      ? 'text-elite-primary'
                      : 'text-white/70 hover:text-white'
                }`}
              >
                {(l as any).electrico && <span className="rayo" aria-hidden />}
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
            {/* "Unirse" a secas era la palabra que causaba la confusion: la
                gente lo leia como "crear mi cuenta". "Entrar al clan" dice lo
                que de verdad hace. */}
            <Link href="/unirse" className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2">
              Entrar al clan
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

          <div className="md:hidden flex items-center gap-1">
            {/* Flecha indicadora: avisa que hay un menu detras. Se oculta cuando
                el menu esta abierto (ya no hace falta). */}
            {!open && (
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ChevronRight className="w-5 h-5 text-elite-gold" />
              </motion.div>
            )}
            <button
              className="p-2 rounded-lg hover:bg-elite-card transition-colors"
              onClick={() => setOpen(!open)}
              aria-label="Menú"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
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
                Entrar al clan
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
