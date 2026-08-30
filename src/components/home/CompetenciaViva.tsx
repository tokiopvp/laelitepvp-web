'use client'

import { motion } from 'framer-motion'
import { Swords } from 'lucide-react'
import { useCompetidores } from '@/lib/hooks'

/**
 * Los tres primeros de la competencia en curso, en la portada.
 *
 * Es lo unico del clan que cambia hora a hora, asi que es lo que hace que
 * alguien vuelva a entrar. Estaba solo en /torneos, escondido.
 */
export default function CompetenciaViva() {
  const { competidores, loading } = useCompetidores()
  const conAvance = competidores.filter((c) => c.avance > 0)

  // Sin competencia o sin nadie sumando todavia, no se ocupa sitio con un
  // panel vacio: el marcador de arriba ya sostiene la tarjeta.
  if (loading || conAvance.length === 0) return null

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.07]">
      <div className="flex items-center gap-2 mb-2.5">
        <Swords className="w-3.5 h-3.5 text-elite-primary" />
        <p className="text-xs uppercase tracking-widest text-white/40">Compitiendo ahora</p>
      </div>
      <div className="space-y-1.5">
        {conAvance.slice(0, 3).map((c, i) => (
          <motion.div
            key={c.member_id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-2.5 text-sm"
          >
            <span
              className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums"
              style={
                i === 0
                  ? { background: 'linear-gradient(135deg,#f0b429,#a78bfa)', color: '#101014' }
                  : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }
              }
            >
              {i + 1}
            </span>
            <span className="flex-1 min-w-0 truncate text-white/80">{c.nickname}</span>
            <span className="font-mono tabular-nums text-elite-primary shrink-0">
              +{c.avance}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
