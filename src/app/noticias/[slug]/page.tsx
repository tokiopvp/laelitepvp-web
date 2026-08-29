import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getNewsBySlug } from '@/lib/data'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Newspaper, ArrowLeft } from 'lucide-react'

export function generateStaticParams() {
  return [
    { slug: 'elite-cup-s12' },
    { slug: 'nuevos-ingresos' },
  ]
}

/**
 * Metadatos del articulo.
 *
 * Antes cada noticia heredaba el titulo de la seccion, asi que Google veia
 * todos los articulos como "Noticias y filtraciones de Free Fire" y ninguno
 * podia posicionar por su propio titular -que es justo lo que la gente busca-.
 * Al compartirlo en WhatsApp o Discord pasaba lo mismo: la tarjeta mostraba el
 * nombre de la seccion en vez de la noticia.
 *
 * Esta pagina SI es de servidor, asi que puede exportar `generateMetadata`.
 */
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const article = await getNewsBySlug(params.slug)
  if (!article) return { title: 'Noticia no encontrada · La Elite PvP' }

  // El extracto es lo que el autor escribio para resumir. Si no hay, se recorta
  // el cuerpo: una descripcion generica no aporta nada en un resultado.
  const desc = (article.excerpt || article.content || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 155)

  return {
    title: `${article.title} · La Elite PvP`,
    description: desc || undefined,
    alternates: { canonical: `/noticias/${params.slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: desc || undefined,
      url: `/noticias/${params.slug}`,
      publishedTime: article.published_at ?? undefined,
      // La portada del articulo manda sobre la imagen general del sitio: una
      // noticia compartida con su propia foto se pulsa mucho mas.
      images: article.cover_image_url ? [article.cover_image_url] : undefined,
    },
  }
}

export default async function NewsDetailPage({ params }: { params: { slug: string } }) {
  const article = await getNewsBySlug(params.slug)

  if (!article) return notFound()

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="section-container max-w-3xl">
        <Link href="/noticias" className="inline-flex items-center gap-2 text-white/60 hover:text-elite-primary mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <article className="card-glow p-8">
          <div className="flex items-center gap-2 text-white/40 text-sm mb-4">
            <Newspaper className="w-4 h-4" />
            <span>{article.published_at ? formatDate(article.published_at) : '—'}</span>
          </div>
          <h1 className="font-display font-bold text-3xl gradient-text mb-4">{article.title}</h1>
          <p className="text-white/70 leading-relaxed whitespace-pre-line">{article.content}</p>
        </article>
      </div>
    </div>
  )
}
