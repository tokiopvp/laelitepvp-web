import Link from 'next/link'
import { Crown } from 'lucide-react'

const navLinks = [
  { href: '/miembros', label: 'Miembros' },
  { href: '/tops', label: 'Tops & Rankings' },
  { href: '/torneos', label: 'Torneos' },
  { href: '/pagostore', label: 'PagoStore' },
  { href: '/noticias', label: 'Noticias' },
  { href: '/unirse', label: 'Unirse' },
]

const socials = [
  {
    label: 'Discord',
    href: 'https://discord.gg',
    path: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.675 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.083.083 0 0 0 .031.057 19.9 19.9 0 0 0 5.992 4.065.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-.214.076.076 0 0 0 .041-.093 13.107 13.107 0 0 0-.844-1.785.077.077 0 0 1-.007-.128 10.2 10.2 0 0 1 .587-.947.077.077 0 0 1 .128-.007c2.123.64 4.35.963 6.638.963s4.515-.323 6.638-.963a.077.077 0 0 1 .128.007c.167.134.337.262.507.382a.077.077 0 0 1-.006.127 13.079 13.079 0 0 0-.844 1.785.076.076 0 0 0 .041.093 14.032 14.032 0 0 0 1.226.214.077.077 0 0 0 .084.028 19.839 19.839 0 0 0 5.992-4.065.081.081 0 0 0 .031-.057c.418-4.481-.426-9.017-3.556-13.66a.061.061 0 0 0-.031-.027zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z',
  },
  {
    label: 'YouTube',
    href: 'https://youtube.com',
    path: 'M23.498 6.186a3.167 3.167 0 0 0-2.112-2.235C20.237 3.596 12 3.596 12 3.596s-8.246 0-9.396.365a3.169 3.169 0 0 0-2.122 2.235C.34 7.534 0 9.452 0 12s.34 4.477.878 5.814a3.167 3.167 0 0 0 2.112 2.225c1.15.365 9.396.365 9.396.365s8.236 0 9.386-.365a3.155 3.155 0 0 0 2.112-2.225c.538-1.347.878-3.265.878-5.814s-.34-4.477-.878-5.823zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  {
    label: 'TikTok',
    href: 'https://tiktok.com',
    path: 'M12.545,10.239v3.821h5.445l-0.712,4.544H12.545v11.435h4.874V10.239H12.545z',
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-.128-.058-1.69-.072-4.949-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  },
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
              {socials.map((s) => (
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
              <li>Discord: discord.gg/laelitepvp</li>
              <li>Email: contacto@laelitepvp.com</li>
              <li>WhatsApp: +52 1 55 1234 5678</li>
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
