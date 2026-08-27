'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Newspaper, ArrowRight } from 'lucide-react'
import { News } from '@/lib/types'
import { getNews } from '@/lib/data'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import Leaks from '@/components/news/Leaks'

export default function NoticiasPage() {
  // Arranca vacio: un anuncio de demostracion en la pagina de noticias
  // se lee como un anuncio de verdad.
  const [news, setNews] = useState<News[]>([])

  useEffect(() => {
    getNews().then(setNews)
  }, [])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="section-container">
        <motion.div initial={{ y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-secondary/10 border border-elite-secondary/30 mb-4">
            <Newspaper className="w-4 h-4 text-elite-secondary" />
            <span className="text-sm font-medium text-elite-secondary">NOTICIAS DEL CLAN</span>
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl gradient-text mb-2">Últimas Noticias</h1>
          <p className="text-white/60">Filtraciones, próximas colaboraciones y todo lo del clan.</p>
        </motion.div>

        {/* Lo que se viene, primero: es lo que trae a la gente. Los anuncios
            del clan van despues, que son para quien ya esta dentro. */}
        <section className="mb-16">
          <Leaks />
        </section>

        {news.length > 0 && (
          <h2 className="section-title !text-2xl sm:!text-3xl mb-6">Del clan</h2>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          {news.map((n, i) => (
            <motion.article
              key={n.id}
              className="card-glow p-6 group"
              initial={{ y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center gap-2 text-white/40 text-sm mb-3">
                <span>{n.published_at ? formatDate(n.published_at) : '—'}</span>
              </div>
              <h2 className="font-display font-bold text-xl mb-2 group-hover:text-elite-primary transition-colors">
                {n.title}
              </h2>
              <p className="text-white/60 text-sm mb-4">{n.excerpt}</p>
              <Link
                href={`/noticias/${n.slug}`}
                className="inline-flex items-center gap-1 text-elite-primary text-sm font-medium hover:gap-2 transition-all"
              >
                Leer más <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  )
}
