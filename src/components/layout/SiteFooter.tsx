import Link from 'next/link'
import { Crown } from 'lucide-react'
import { REDES, DISCORD, EMAIL } from '@/lib/contacto'

const navLinks = [
  { href: '/miembros', label: 'Miembros' },
  { href: '/tops', label: 'Tops & Rankings' },
  { href: '/torneos', label: 'Torneos' },
  { href: '/pagostore', label: 'PagoStore' },
  { href: '/noticias', label: 'Noticias' },
  { href: '/unirse', label: 'Unirse' },
]


export default function SiteFooter() {
  return (
    <footer className="border-t border-elite-border py-12 bg-elite-dark/50">
      <div className="section-container">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-elite-primary to-elite-secondary flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <span className="font-display font-bold text-xl gradient-text">La Elite PvP</span>
            </Link>
            <p className="text-white/60 max-w-sm">
              Clan competitivo de Free Fire. Dominamos el meta, ganamos torneos y cuidamos a los nuestros.
              Fundado 2024 · TokioCEO
            </p>
            <div className="flex gap-4 mt-6">
              {REDES.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener"
                  aria-label={s.label}
                  className="w-10 h-10 rounded-xl bg-elite-card border border-elite-border flex items-center justify-center hover:border-elite-primary/50 hover:bg-elite-primary/10 transition-all"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-lg mb-4">Navegación</h4>
            <ul className="space-y-2 text-white/60">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-elite-primary transition-colors text-sm">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-lg mb-4">Contacto</h4>
            <ul className="space-y-2 text-white/60 text-sm">
              <li>
                <a href={DISCORD} target="_blank" rel="noopener" className="hover:text-elite-primary transition-colors">
                  Discord: {DISCORD.replace('https://', '')}
                </a>
              </li>
              <li>
                <a href={`mailto:${EMAIL}`} className="hover:text-elite-primary transition-colors">
                  Email: {EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-elite-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">
            © 2025 La Elite PvP. Todos los derechos reservados. No afiliado a Garena Free Fire.
          </p>
          <div className="flex items-center gap-4 text-white/40 text-sm">
            <Link href="/privacidad" className="hover:text-elite-primary transition-colors">Privacidad</Link>
            <Link href="/terminos" className="hover:text-elite-primary transition-colors">Términos</Link>
            <Link href="/cookies" className="hover:text-elite-primary transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
