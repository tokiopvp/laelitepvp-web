import type { MetadataRoute } from 'next'

/**
 * robots.txt propio.
 *
 * Antes se servia el generico de Cloudflare, que no decia ni que se puede
 * rastrear ni donde esta el mapa del sitio. Aqui se abre todo lo publico, se
 * cierra lo que no debe indexarse y se apunta al sitemap.
 */
export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // El panel y el perfil personal no son secretos —eso lo protege el rol—
      // pero no tienen nada que hacer en un buscador.
      disallow: ['/admin', '/admin/', '/mi', '/auth/'],
    },
    sitemap: 'https://www.laelitepvp.com/sitemap.xml',
  }
}
