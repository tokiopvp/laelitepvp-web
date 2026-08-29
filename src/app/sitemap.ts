import type { MetadataRoute } from 'next'

/**
 * Mapa del sitio.
 *
 * No habia ninguno: `/sitemap.xml` devolvia 404 y el robots.txt que servia
 * Cloudflare por defecto no apuntaba a nada. Sin mapa, Google descubre las
 * paginas solo siguiendo enlaces, y las que cuelgan del menu tardan semanas.
 *
 * Se listan solo las paginas publicas: el panel y el perfil personal van con
 * `noindex` y no pintan nada aqui.
 */
const BASE = 'https://www.laelitepvp.com'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date()
  // La prioridad no es una promesa a Google, es una pista sobre que paginas
  // importan mas cuando tiene que elegir. La tienda y la portada primero.
  const rutas: [string, number, 'daily' | 'weekly' | 'monthly'][] = [
    ['', 1.0, 'daily'],
    ['/pagostore', 0.9, 'daily'],
    ['/comunidad', 0.9, 'daily'],
    ['/miembros', 0.8, 'weekly'],
    ['/tops', 0.8, 'daily'],
    ['/noticias', 0.7, 'daily'],
    ['/torneos', 0.6, 'weekly'],
    ['/unirse', 0.6, 'monthly'],
    ['/ia', 0.6, 'monthly'],
    ['/privacidad', 0.3, 'monthly'],
    ['/terminos', 0.3, 'monthly'],
    ['/cookies', 0.3, 'monthly'],
  ]
  return rutas.map(([ruta, priority, changeFrequency]) => ({
    url: BASE + ruta,
    lastModified: ahora,
    changeFrequency,
    priority,
  }))
}
