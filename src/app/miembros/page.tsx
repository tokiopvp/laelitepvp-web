'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Flame, Trophy, Users, Star, Skull, Swords, Crosshair, Brain, Shield, Zap, Target, Medal } from 'lucide-react'
import { Member } from '@/lib/types'
import { useMembers } from '@/lib/hooks'
import { STAT_CATEGORIES, formatStat } from '@/lib/stats'
import IconoJugador from '@/components/miembros/IconoJugador'
import EmblemaRango from '@/components/miembros/EmblemaRango'
import OutfitModal from '@/components/OutfitModal'
import { MemberGridSkeleton } from '@/components/Skeletons'
import Resplandor from '@/components/layout/Resplandor'

const ROLE_ICONS: Record<string, any> = {
  leader: Crown,
  interim_leader: Flame,
  elder: Star,
  member: Skull,
}

const ROLE_LABELS: Record<string, string> = {
  leader: 'Líder',
  interim_leader: 'Líder Interino',
  elder: 'Decano',
  member: 'Miembro',
}

// Clases CSS para los efectos de cada rol
const ROLE_CLASS: Record<string, string> = {
  leader: 'member-leader',
  interim_leader: 'member-interim',
  elder: 'member-elder',
}

interface BadgeDef {
  key: string
  label: string
  icon: any
  color: string
  test: (m: Member) => boolean
}

// Insignias disponibles, cada una sacada de un dato real del barrido.
const BADGES: BadgeDef[] = [
  { key: 'kd', label: 'Asesino', icon: Swords, color: '#ff4d6a', test: (m) => (m.kd_ratio || 0) >= 4 },
  { key: 'hs', label: 'Francotirador', icon: Crosshair, color: '#5b9dff', test: (m) => (m.headshot_tasa || 0) >= 25 },
  { key: 'wr', label: 'Estratega', icon: Brain, color: '#f0b429', test: (m) => (m.winrate || 0) >= 15 },
  { key: 'kills', label: 'Destructor', icon: Skull, color: '#a78bfa', test: (m) => (m.kills || 0) >= 800 },
  { key: 'maxk', label: 'Multikill', icon: Zap, color: '#ffd166', test: (m) => (m.max_kills || 0) >= 12 },
  { key: 'booyah', label: 'Rey Booyah', icon: Trophy, color: '#3ddc97', test: (m) => (m.booyahs || 0) >= 100 },
  { key: 'rev', label: 'Salvavidas', icon: Shield, color: '#36e0ff', test: (m) => (m.revividas || 0) >= 50 },
  { key: 'part', label: 'Veterano', icon: Star, color: '#c0c0c0', test: (m) => (m.partidas || 0) >= 400 },
  { key: 'top10', label: 'Finalista', icon: Target, color: '#ffffff', test: (m) => (m.top10_tasa || 0) >= 15 },
]

// Etiquetas cortas para la ficha. Las de STAT_CATEGORIES ("Headshots",
// "Victorias") no caben en una columna de tres y salian cortadas a media
// palabra ("HEADSH", "VICTORI"), que se lee peor que no poner nada.
const ETIQUETA_CORTA: Record<string, string> = {
  kd: 'K/D',
  kills: 'Kills',
  winrate: 'Win %',
  headshots: 'HS',
  wins: 'Wins',
  booyahs: 'Booyah',
}

function getBadges(m: Member): BadgeDef[] {
  const found = BADGES.filter((b) => b.test(m))
  if (found.length === 0) {
    return [{ key: 'novato', label: 'Recién llegado', icon: Medal, color: '#7f93a6', test: () => true }]
  }
  // Tres como maximo. Con seis insignias la tarjeta se convierte en una sopa
  // de etiquetas y ninguna significa nada; con tres, las que salen destacan.
  return found.slice(0, 3)
}

export default function MiembrosPage() {
  const { members, loading } = useMembers()
  const [verOutfit, setVerOutfit] = useState<Member | null>(null)

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Resplandor className="top-1/4 left-1/4 w-96 h-96" color="#5b9dff" />
        <Resplandor className="bottom-1/4 right-1/5 w-80 h-80" color="#3b6fd4" />
      </div>

      <div className="section-container">
        <motion.div
          initial={{ y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 ff-cut-sm bg-elite-primary/10 border border-elite-primary/40 mb-4">
            <Users className="w-4 h-4 text-elite-primary" />
            <span className="text-sm font-medium tracking-widest uppercase neon-celeste">
              {members.length} miembros oficiales
            </span>
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-6xl gradient-text mb-2 uppercase">
            Miembros Elite
          </h1>
          <p className="text-white/50">El squad más letal de Free Fire. Cada uno una leyenda.</p>
        </motion.div>

        {loading && members.length === 0 ? (
          <MemberGridSkeleton />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {members.map((member, i) => {
            const role = member.role_in_clan || 'member'
            const RoleIcon = ROLE_ICONS[role] || Skull
            const roleClass = ROLE_CLASS[role] || ''
            const badges = getBadges(member)
            const puntosBR = member.puntos_br ?? member.stats_json?.puntos_br ?? null
            const color = member.emblema_br_url || puntosBR ? '#5b9dff' : '#44586b'

            return (
              <motion.div
                key={member.id}
                onClick={() => setVerOutfit(member)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setVerOutfit(member) }}
                className={`ff-panel p-5 group relative cursor-pointer
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-elite-primary ${roleClass}`}
                /*
                  La entrada se hace en SITIO, sin desplazamiento.

                  Antes cada tarjeta subia 30 px al aparecer. En escritorio, con
                  cuatro por fila, se ve elegante. En el movil son 44 tarjetas
                  en una sola columna subiendo escalonadas mientras intentas
                  leer: la pagina parece moverse por su cuenta.

                  Y el `initial` no llevaba `opacity: 0` aunque el `animate` si
                  ponia `opacity: 1`, asi que no habia ni fundido: solo el
                  brinco. Ahora es un fundido corto y nada mas se mueve.
                */
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i, 10) * 0.03, duration: 0.3 }}
                whileHover={{ y: -6 }}
              >
                {/* Halo del rango, como degradado radial y no como desenfoque:
                    se ve igual y no cuesta un `blur` por tarjeta. */}
                <div
                  className="absolute -top-14 -right-14 w-40 h-40 rounded-full opacity-25 pointer-events-none"
                  style={{ background: `radial-gradient(closest-side, ${color} 0%, transparent 100%)` }}
                />

                {/* Cinta superior: la pestaña diagonal del juego. */}
                <div
                  className="-mx-5 -mt-5 mb-4 h-1.5 ff-tab"
                  style={{ background: `linear-gradient(90deg, ${color}, transparent 78%)` }}
                />

                <div className="flex items-start gap-3 mb-4">
                  <div className="relative">
                    <IconoJugador
                      src={member.avatar_url}
                      nombre={member.nickname}
                      size={62}
                      aura={color}
                      prioritaria={i < 8}
                    />
                    <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 ff-cut-sm bg-elite-dark
                                    border border-elite-primary/40 flex items-center justify-center">
                      <RoleIcon className="w-3.5 h-3.5 text-elite-gold" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-bold text-lg leading-tight truncate uppercase text-elite-ice">
                      {member.nickname}
                    </h3>
                    <p className="text-white/40 text-xs capitalize tracking-wide">
                      {ROLE_LABELS[role] || 'Miembro'}
                      {member.level ? <span className="text-white/25"> · Nvl {member.level}</span> : null}
                    </p>
                  </div>

                  {/* EL EMBLEMA REAL, arriba a la derecha y a tamaño de verdad.
                      Es lo que el jugador se gano en el juego: merece sitio.
                      Mientras no haya imagen se enseñan sus PUNTOS de
                      temporada, que ya viajan en stats_json y son un dato de
                      verdad -al contrario que `rank`, que dice "Heroic" para
                      los 44 y no distingue a nadie-. */}
                  <EmblemaRango
                    imagen={member.emblema_br_url}
                    puntos={puntosBR}
                    temporada={member.temporada_br}
                    size={54}
                    className="shrink-0"
                    prioritaria={i < 8}
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {badges.map((b) => {
                    const Icon = b.icon
                    return (
                      <span
                        key={b.key}
                        title={b.label}
                        className="inline-flex items-center gap-1 px-2 py-0.5 ff-cut-sm text-[10px]
                                   font-semibold uppercase tracking-wider border"
                        style={{ color: b.color, borderColor: `${b.color}44`, background: `${b.color}12` }}
                      >
                        <Icon className="w-3 h-3" />
                        {b.label}
                      </span>
                    )
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm">
                  {(['kd', 'kills', 'winrate'] as const).map((k) => {
                    const s = STAT_CATEGORIES.find((x) => x.key === k)!
                    return (
                      <div
                        key={k}
                        className="ff-cut-sm p-2.5 bg-white/[0.04] border border-white/10
                                   group-hover:border-elite-primary/30 transition-colors"
                      >
                        <p className="text-white/40 text-[10px] uppercase tracking-wider">
                          {ETIQUETA_CORTA[k] ?? s.label}
                        </p>
                        <p className="font-bold text-base tabular-nums text-elite-ice">
                          {formatStat(s.get(member), s)}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                  {(['headshots', 'wins', 'booyahs'] as const).map((k) => {
                    const s = STAT_CATEGORIES.find((x) => x.key === k)!
                    return (
                      <div
                        key={k}
                        className="ff-cut-sm p-2.5 bg-white/[0.04] border border-white/10
                                   group-hover:border-elite-primary/30 transition-colors"
                      >
                        <p className="text-white/40 text-[10px] uppercase tracking-wider flex items-center gap-1">
                          {k === 'headshots' && <Flame className="w-3 h-3 shrink-0" />}
                          {k === 'wins' && <Trophy className="w-3 h-3 shrink-0" />}
                          {ETIQUETA_CORTA[k] ?? s.label}
                        </p>
                        <p className="font-bold text-base tabular-nums text-elite-ice">
                          {formatStat(s.get(member), s)}
                        </p>
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
