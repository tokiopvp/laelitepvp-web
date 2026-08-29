'use client'

import { motion } from 'framer-motion'
import { Trophy, Crown, Users, Calendar, Target, Radio, CheckCircle2 } from 'lucide-react'
import { Tournament, Member } from '@/lib/types'
import { useTournaments, useMembers, useCompetidores } from '@/lib/hooks'
import { formatDate } from '@/lib/utils'
import { TournamentListSkeleton } from '@/components/Skeletons'
import Resplandor from '@/components/layout/Resplandor'

const modeColors: Record<string, string> = {
  Solo: '#e11d3c',
  Duo: '#ff4d68',
  Squad: '#ffd700',
  'Clash Squad': '#ff6b6b',
}

const rankColors: Record<string, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Platinum: '#e5e4e2',
  Diamond: '#b9f2ff',
  Master: '#ff6b6b',
  Grandmaster: '#ff2d6f',
}

function hasData(m: Member): boolean {
  return Boolean(m.stats_json && Object.keys(m.stats_json).length > 0) || Boolean(m.last_sync)
}

function Avatar({ m }: { m: Member }) {
  const color = (m.rank ? rankColors[m.rank] : null) || '#6b6156'
  const src = m.outfit_image_url || m.avatar_url
  if (src) {
    return (
      <img
        src={src}
        alt={m.nickname}
        className="w-10 h-10 rounded-full object-cover border-2"
        style={{ borderColor: color }}
      />
    )
  }
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm border-2"
      style={{ borderColor: color, color, background: `${color}15` }}
    >
      {m.nickname?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

export default function TorneosPage() {
  const { tournaments, loading: loadingT } = useTournaments()
  const { members, loading: loadingM } = useMembers()
  const { competidores, loading: loadingC } = useCompetidores()
  const conAvance = competidores.filter((c) => c.avance > 0).length

  const withData = members.filter(hasData).length
  const total = members.length
  const pct = total ? Math.round((withData / total) * 100) : 0

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Resplandor className="top-1/3 left-1/3 w-96 h-96" color="#d4a24c" />
      </div>

      <div className="section-container">
        <motion.div initial={{ y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-gold/10 border border-elite-gold/30 mb-4">
            <Trophy className="w-4 h-4 text-elite-gold" />
            <span className="text-sm font-medium text-elite-gold">{tournaments.filter(t => t.placement === 1).length} CAMPEONATOS GANADOS</span>
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl gradient-text mb-2">Torneos</h1>
          <p className="text-white/60">Nuestra sala de trofeos. Cada victoria cuenta una historia.</p>
        </motion.div>

        {/* Competencia en vivo: SOLO quienes compiten, con su avance.
            Antes salian los 49 miembros del clan y su K/D historico, que no
            tiene nada que ver con la carrera que esta corriendo ahora. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glow p-6 mb-12"
        >
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-elite-primary animate-pulse" />
              <h2 className="font-display font-bold text-xl">Competencia en vivo</h2>
            </div>
            <span className="text-sm text-white/60">
              <span className="text-elite-primary font-bold tabular-nums">{conAvance}</span>
              {' '}de {competidores.length} ya sumaron
            </span>
          </div>

          <p className="text-white/50 text-sm mb-5">
            Solo cuenta lo que suban desde que abrió la competencia. Se actualiza solo.
          </p>

          {loadingC ? (
            <p className="text-white/40 text-sm">Cargando competencia…</p>
          ) : competidores.length === 0 ? (
            <p className="text-white/40 text-sm">
              No hay competencia abierta ahora mismo.
            </p>
          ) : (
            <div className="space-y-2">
              {competidores.map((c, i) => {
                const lider = i === 0 && c.avance > 0
                return (
                  <div
                    key={c.member_id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div
                      className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold tabular-nums"
                      style={
                        lider
                          ? { background: 'linear-gradient(135deg,#e8b33c,#ff4d68)', color: '#17130f' }
                          : { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }
                      }
                    >
                      {i + 1}
                    </div>
                    <p className="flex-1 min-w-0 text-sm font-semibold truncate" title={c.nickname}>
                      {c.nickname}
                    </p>
                    {c.rank && (
                      <span
                        className="hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={{
                          color: rankColors[c.rank] || '#6b6156',
                          background: `${rankColors[c.rank] || '#6b6156'}15`,
                        }}
                      >
                        {c.rank}
                      </span>
                    )}
                    <span
                      className="font-mono tabular-nums text-sm shrink-0 w-16 text-right"
                      style={{ color: c.avance > 0 ? '#e11d3c' : 'rgba(255,255,255,0.3)' }}
                    >
                      {c.avance > 0 ? `+${c.avance}` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>

        {loadingT && tournaments.length === 0 ? (
          <TournamentListSkeleton />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t, i) => (
            <motion.div
              key={t.id}
              className="card-glow p-6 group relative overflow-hidden"
              initial={{ y: 30 }}
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
                  <Users className="w-3 h-3" /> {t.participants_count ?? 0}
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
                  <span
                    className="font-bold"
                    style={{ color: t.placement === 1 ? '#e8b33c' : t.placement ? '#fff' : '#e11d3c' }}
                  >
                    {t.placement === 1 ? '🏆 CAMPEÓN' : t.placement ? `#${t.placement}` : '🔴 EN CURSO'}
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
      )}
      </div>
    </div>
  )
}
