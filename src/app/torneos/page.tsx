'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Crown, Users, Calendar, Target } from 'lucide-react'
import { Tournament } from '@/lib/types'
import { getTournaments, subscribeToTable } from '@/lib/data'
import { formatDate } from '@/lib/utils'

const modeColors: Record<string, string> = {
  Solo: '#00d4ff',
  Duo: '#7c3aed',
  Squad: '#ffd700',
  'Clash Squad': '#ff6b6b',
}

export default function TorneosPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])

  useEffect(() => {
    getTournaments().then(setTournaments)
    const unsub = subscribeToTable('tournaments', () => {
      getTournaments().then(setTournaments)
    })
    return unsub
  }, [])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute top-1/3 left-1/3 w-96 h-96 bg-elite-gold/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 9, repeat: Infinity }}
        />
      </div>

      <div className="section-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-gold/10 border border-elite-gold/30 mb-4">
            <Trophy className="w-4 h-4 text-elite-gold" />
            <span className="text-sm font-medium text-elite-gold">{tournaments.filter(t => t.placement === 1).length} CAMPEONATOS GANADOS</span>
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl gradient-text mb-2">Torneos</h1>
          <p className="text-white/60">Nuestra sala de trofeos. Cada victoria cuenta una historia.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t, i) => (
            <motion.div
              key={t.id}
              className="card-glow p-6 group relative overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5 }}
            >
              {t.placement === 1 && (
                <div className="absolute top-4 right-4">
                  <Crown className="w-8 h-8 text-elite-gold" />
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${modeColors[t.game_mode || 'Squad']}20`, color: modeColors[t.game_mode || 'Squad'] }}
                >
                  {t.game_mode}
                </div>
                <div className="text-white/50 text-sm flex items-center gap-1">
                  <Users className="w-3 h-3" /> {t.participants_count}
                </div>
              </div>

              <h3 className="font-display font-bold text-xl mb-2 pr-8">{t.name}</h3>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/50 flex items-center gap-1"><Target className="w-3 h-3" /> Premio</span>
                  <span className="font-bold text-elite-gold">{t.prize}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50 flex items-center gap-1"><Trophy className="w-3 h-3" /> Posición</span>
                  <span className="font-bold" style={{ color: t.placement === 1 ? '#ffd700' : '#fff' }}>
                    {t.placement === 1 ? '🏆 CAMPEÓN' : `#${t.placement}`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50 flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha</span>
                  <span className="text-white/70">{t.date_played ? formatDate(t.date_played) : '—'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
