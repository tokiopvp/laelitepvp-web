'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Radar, ExternalLink } from 'lucide-react'
import { getLeaks, type Leak } from '@/lib/data'

/**
 * Lo que se viene en Free Fire.
 *
 * Es un AGREGADOR, y la interfaz lo dice: cada tarjeta lleva su fuente
 * visible y todo el bloque es un enlace al medio que lo publico. El resumen
 * es un adelanto para decidir si abres, no el articulo.
 *
 * El bot de ventas ya vigilaba seis fuentes y traducia al espanol; ese trabajo
 * solo lo veia WhatsApp.
 */
function haceCuanto(ts: number): string {
  if (!ts) return ''
  const seg = Math.max(0, Math.floor(Date.now() / 1000 - ts))
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`
  const d = Math.floor(seg / 86400)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

export default function Leaks() {
  const [items, setItems] = useState<Leak[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    getLeaks()
      .then((r) => { if (vivo) setItems(r.items) })
      .finally(() => { if (vivo) setCargando(false) })
    // Se refresca cada 10 min: las filtraciones no salen cada minuto.
    const id = setInterval(() => getLeaks().then((r) => vivo && setItems(r.items)), 600_000)
    return () => { vivo = false; clearInterval(id) }
  }, [])

  if (cargando) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-64 animate-pulse bg-white/[0.03]" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center text-white/45">
        No hay filtraciones nuevas ahora mismo. Vuelve en un rato.
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity }}
          className="inline-flex"
        >
          <Radar className="w-5 h-5 text-elite-primary" />
        </motion.span>
        <h2 className="section-title !mb-0 !text-2xl sm:!text-3xl">Lo que se viene</h2>
      </div>
      <p className="text-white/50 mb-6">
        Filtraciones y próximas colaboraciones, reunidas de {new Set(items.map((i) => i.fuente)).size}{' '}
        fuentes y traducidas. Toca para leer el original.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it, i) => (
          <motion.a
            key={it.link}
            href={it.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.4 }}
            whileHover={{ y: -4 }}
            className="card group overflow-hidden flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-elite-primary"
          >
            {it.imagen && (
              <div className="relative h-40 shrink-0 overflow-hidden bg-black/40">
                {/* Portada del propio medio. Si no carga, la tarjeta sigue
                    entendiendose: el titular manda, la imagen acompaña. */}
                <img
                  src={it.imagen}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(0deg, rgba(16,16,20,0.9), transparent 55%)' }}
                />
              </div>
            )}

            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-elite-primary truncate">
                  {it.fuente}
                </span>
                <span className="text-[10px] text-white/30 shrink-0 ml-auto">
                  {haceCuanto(it.ts) || it.fecha}
                </span>
              </div>

              <h3 className="font-display font-semibold leading-snug mb-2 line-clamp-3">
                {it.titulo}
              </h3>

              {it.resumen && (
                <p className="text-[13px] text-white/50 leading-relaxed line-clamp-3 mb-3">
                  {it.resumen}
                </p>
              )}

              <span className="mt-auto inline-flex items-center gap-1.5 text-[11px] text-white/35 group-hover:text-elite-primary transition-colors">
                <ExternalLink className="w-3 h-3" />
                Leer en {it.fuente.split(' ')[0]}
              </span>
            </div>
          </motion.a>
        ))}
      </div>
    </>
  )
}
