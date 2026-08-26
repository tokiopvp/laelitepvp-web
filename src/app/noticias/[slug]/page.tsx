import { notFound } from 'next/navigation'
import { demoNews } from '@/lib/demo-data'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Newspaper, ArrowLeft } from 'lucide-react'

export function generateStaticParams() {
  return demoNews.map((n) => ({ slug: n.slug }))
}

export default function NewsDetailPage({ params }: { params: { slug: string } }) {
  const article = demoNews.find((n) => n.slug === params.slug)

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
