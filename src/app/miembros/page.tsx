'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Flame, Trophy, Users, Star, Skull, Swords, Crosshair, Brain, Shield, Zap, Target, Medal } from 'lucide-react'
import { Member, Rank } from '@/lib/types'
import { useMembers } from '@/lib/hooks'
import { cn } from '@/lib/utils'
import { STAT_CATEGORIES, formatStat } from '@/lib/stats'
import { RankEmblem } from '@/components/RankEmblem'
import OutfitModal from '@/components/OutfitModal'
import { MemberGridSkeleton } from '@/components/Skeletons'

const RANK_COLORS: Record<string, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Platinum: '#e5e4e2',
  Diamond: '#b9f2ff',
  Master: '#ff6b6b',
  Grandmaster: '#c77dff',
  Heroic: '#ff2e63',
}

const ROLE_ICONS: Record<string, any> = {
  leader: Crown,
  'co-leader': Flame,
  elder: Star,
  member: Skull,
}

// Rango Elite del clan, derivado de stats reales del barrido (kd, winrate,
// kills y headshots). No es el rango oficial de Free Fire: el bot no lo captura
// todavia, pero se calcula para que cada miembro luzca un rango epico.

interface BadgeDef {
  key: string
  label: string
  icon: any
  color: string
  test: (m: Member) => boolean
}

// Insignias disponibles, cada una sacada de un dato real del barrido.
const BADGES: BadgeDef[] = [
  { key: 'kd', label: 'Asesino', icon: Swords, color: '#ff4d4d', test: (m) => (m.kd_ratio || 0) >= 4 },
  { key: 'hs', label: 'Francotirador', icon: Crosshair, color: '#ff4d68', test: (m) => (m.headshot_tasa || 0) >= 25 },
  { key: 'wr', label: 'Estratega', icon: Brain, color: '#e8b33c', test: (m) => (m.winrate || 0) >= 15 },
  { key: 'kills', label: 'Destructor', icon: Skull, color: '#ffd700', test: (m) => (m.kills || 0) >= 800 },
  { key: 'maxk', label: 'Multikill', icon: Zap, color: '#ff9d00', test: (m) => (m.max_kills || 0) >= 12 },
  { key: 'booyah', label: 'Rey Booyah', icon: Trophy, color: '#39ff14', test: (m) => (m.booyahs || 0) >= 100 },
  { key: 'rev', label: 'Salvavidas', icon: Shield, color: '#36e0ff', test: (m) => (m.revividas || 0) >= 50 },
  { key: 'part', label: 'Veterano', icon: Star, color: '#c0c0c0', test: (m) => (m.partidas || 0) >= 400 },
  { key: 'top10', label: 'Finalista', icon: Target, color: '#ff5edb', test: (m) => (m.top10_tasa || 0) >= 15 },
]

function getBadges(m: Member): BadgeDef[] {
  const found = BADGES.filter((b) => b.test(m))
  if (found.length === 0) {
    return [{ key: 'novato', label: 'Recién llegado', icon: Medal, color: '#8a8aa0', test: () => true }]
  }
  return found
}

export default function MiembrosPage() {
  const { members, loading } = useMembers()
  const [verOutfit, setVerOutfit] = useState<Member | null>(null)

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-elite-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      <div className="section-container">
        <motion.div
          initial={{ y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-primary/10 border border-elite-primary/30 mb-4">
            <Users className="w-4 h-4 text-elite-primary" />
            <span className="text-sm font-medium text-elite-primary">{members.length} MIEMBROS OFICIALES</span>
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl gradient-text mb-2">Miembros Elite</h1>
          <p className="text-white/60">El squad más letal de Free Fire. Cada uno una leyenda.</p>
        </motion.div>

        {loading && members.length === 0 ? (
          <MemberGridSkeleton />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {members.map((member, i) => {
            const RoleIcon = ROLE_ICONS[member.role_in_clan || 'member'] || Skull
            // El rango REAL del juego, o nada. Antes, cuando venia vacio se
            // rellenaba con getEliteRank() -una puntuacion casera- y se pintaba
            // con el mismo emblema y el mismo distintivo que el de verdad: el
            // visitante no podia distinguir el rango que el jugador se gano en
            // Free Fire de uno que calculo esta web.
            const rankReal = (member.rank as Rank | null) ?? null
            const color = rankReal ? (RANK_COLORS[rankReal] || '#888') : '#6b6156'
            const badges = getBadges(member)
            return (
              <motion.div
                key={member.id}
                onClick={() => setVerOutfit(member)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setVerOutfit(member) }}
                className="card-glow p-6 group relative overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-elite-primary"
                initial={{ y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -8 }}
              >
                {/* halo de rango */}
                <div
                  className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-2xl opacity-30 pointer-events-none"
                  style={{ background: color }}
                />
                <div
                  className="-mx-6 -mt-6 mb-5 h-2 rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
                />
                <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                    {/* El icono REAL del jugador, recortado por el bot de su
                        propio perfil. Las iniciales quedan solo para quien
                        todavia no ha pasado por el barrido. */}
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt=""
                        loading="lazy"
                        className="w-16 h-16 rounded-2xl object-cover ring-1 ring-white/10"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-elite-primary/20 to-elite-secondary/20 flex items-center justify-center text-2xl font-display font-bold gradient-text ring-1 ring-white/10">
                        {(member.nickname || '??').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-elite-dark border border-elite-border flex items-center justify-center">
                      <RoleIcon className="w-4 h-4 text-elite-gold" />
                    </div>
                  </div>
                  {rankReal ? (
                    <div
                      className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                      style={{
                        backgroundColor: `${color}1f`,
                        color,
                        boxShadow: `0 0 14px ${color}55`,
                      }}
                    >
                      <RankEmblem rank={rankReal} size={18} />
                      {rankReal}
                    </div>
                  ) : (
                    <div
                      className="px-3 py-1 rounded-full text-xs font-medium text-white/35 border border-white/10"
                      title="El bot todavía no ha leído el rango de este jugador"
                    >
                      Rango pendiente
                    </div>
                  )}
                </div>

                <h3 className="font-display font-bold text-xl mb-1">{member.nickname}</h3>
                <p className="text-white/50 text-sm mb-3 capitalize">{member.role_in_clan}</p>

                {/* insignias */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {badges.map((b) => {
                    const Icon = b.icon
                    return (
                      <span
                        key={b.key}
                        title={b.label}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                        style={{ color: b.color, borderColor: `${b.color}55`, background: `${b.color}14` }}
                      >
                        <Icon className="w-3 h-3" />
                        {b.label}
                      </span>
                    )
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {(['kd', 'wins', 'headshots', 'booyahs', 'kills', 'winrate'] as const).map((k) => {
                    const s = STAT_CATEGORIES.find((x) => x.key === k)!
                    return (
                      <div key={k} className="rounded-lg p-3 bg-white/[0.06] backdrop-blur-md border border-white/10 hover:border-white/20 transition-colors">
                        <p className="text-white/50 text-xs flex items-center gap-1">
                          {k === 'headshots' && <Flame className="w-3 h-3" />}
                          {k === 'wins' && <Trophy className="w-3 h-3" />}
                          {s.label}
                        </p>
                        <p className="font-bold text-lg">{formatStat(s.get(member), s)}</p>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
          </div>
        )}
      </div>
      <OutfitModal member={verOutfit} onClose={() => setVerOutfit(null)} />
    </div>
  )
}
