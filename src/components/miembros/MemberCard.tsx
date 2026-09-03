'use client'

import { Crown, Flame, Trophy, Users, Star, Skull, Swords, Crosshair, Brain, Shield, Zap, Target, Medal, Percent } from 'lucide-react'
import { motion } from 'framer-motion'
import { Member } from '@/lib/types'
import IconoJugador from '@/components/miembros/IconoJugador'
import EmblemaRango from '@/components/miembros/EmblemaRango'
import { armasDe, nombreArma } from '@/lib/armas'

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

const INTENSIDAD_ROL: Record<string, number> = {
  leader: 1,
  interim_leader: 0.4,
  elder: 0.2,
}

const ROLE_CLASS: Record<string, string> = {
  leader: 'member-leader',
  interim_leader: 'member-interim',
  elder: 'member-elder',
}

const AURA_ROL: Record<string, string> = {
  leader: '#f0b429',
  interim_leader: '#8ab4ff',
  elder: '#cd7f32',
}

interface BadgeDef {
  key: string
  label: string
  icon: any
  color: string
  test: (m: Member) => boolean
}

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

function getBadges(m: Member): BadgeDef[] {
  const found = BADGES.filter((b) => b.test(m))
  if (found.length === 0) {
    return [{ key: 'novato', label: 'Recién llegado', icon: Medal, color: '#7f93a6', test: () => true }]
  }
  return found.slice(0, 3)
}

function getTopWeapon(m: Member): { name: string; kills: number } | null {
  const br = armasDe(m, 'br', 'temp')
  const cs = armasDe(m, 'cs', 'temp')
  const all = [...br, ...cs].sort((a, b) => b.kills - a.kills)
  const top = all[0]
  if (!top || top.kills <= 0) return null
  return { name: nombreArma(top.arma), kills: top.kills }
}

interface Props {
  member: Member
  index: number
  onClick: (member: Member) => void
}

export default function MemberCard({ member, index, onClick }: Props) {
  const role = member.role_in_clan || 'member'
  const RoleIcon = ROLE_ICONS[role] || Skull
  const roleClass = ROLE_CLASS[role] || ''
  const badges = getBadges(member)
  const puntosBR = member.puntos_br ?? member.stats_json?.puntos_br ?? null
  const esMando = INTENSIDAD_ROL[role] != null
  const aura = AURA_ROL[role] ?? (member.emblema_br_url || puntosBR ? '#5b9dff' : '#44586b')
  const color = esMando ? AURA_ROL[role] : (member.emblema_br_url || puntosBR ? '#5b9dff' : '#44586b')

  const handleMouseMove = INTENSIDAD_ROL[role] == null
    ? undefined
    : (e: React.MouseEvent<HTMLDivElement>) => {
        const c = e.currentTarget
        const r = c.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        c.style.setProperty('--ry', String(x * 14))
        c.style.setProperty('--rx', String(-y * 14))
      }

  const handleMouseLeave = INTENSIDAD_ROL[role] == null
    ? undefined
    : (e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.setProperty('--rx', '0')
        e.currentTarget.style.setProperty('--ry', '0')
      }

  return (
    <motion.div
      onClick={() => onClick(member)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(member) }}
      className={`ff-panel overflow-hidden p-5 group relative cursor-pointer
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-elite-primary ${roleClass}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index, 10) * 0.03, duration: 0.3 }}
      whileHover={{ y: -6 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Galón del rango */}
      {INTENSIDAD_ROL[role] != null && (
        <>
          <div className="galon-rango" />
          <div className="corriente-rango" />
        </>
      )}

      {/* Aura del líder */}
      {role === 'leader' && (
        <>
          <span className="rayo-aura hora top" />
          <span className="rayo-aura hora bottom" />
          <span className="rayo-aura vert left" />
          <span className="rayo-aura vert right" />
        </>
      )}

      {/* Halo del rango */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-25 pointer-events-none"
        style={{ background: `radial-gradient(closest-side, ${color} 0%, transparent 100%)` }}
      />

      {/* Marca de agua del cargo */}
      {esMando && (
        <RoleIcon
          aria-hidden
          className="absolute -bottom-4 -right-4 w-28 h-28 rotate-12 pointer-events-none"
          style={{ color, opacity: 0.055 }}
        />
      )}

      {/* FF top bar */}
      <div className="-mx-5 -mt-5 mb-3 flex items-center justify-between
                      px-4 py-2 bg-black/40 backdrop-blur-sm
                      border-b border-white/[0.07]">
        <img
          src="/free-fire-logo.png"
          alt="Free Fire"
          className="h-[13px] w-auto opacity-90"
          loading={index < 8 ? 'eager' : 'lazy'}
        />
        <span className="font-display text-[9px] font-bold uppercase
                         tracking-[0.17em] text-white/30">
          LA ELITE <b style={{ color }}>PVP</b>
        </span>
      </div>

      {/* Name card */}
      <div className="relative flex items-start gap-3 mb-2.5 p-2.5 ff-cut-sm
                      border border-white/20 bg-white/[0.07] backdrop-blur-md">
        <IconoJugador
          src={member.avatar_url}
          nombre={member.nickname}
          size={50}
          aura={aura}
          prioritaria={index < 8}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-[16px] leading-tight
                         uppercase truncate text-elite-ice">
            {member.nickname}
          </h3>
          <span
            className="inline-flex items-center gap-1 mt-1 px-1.5 py-px
                       text-[9px] font-bold uppercase tracking-[0.13em]
                       bg-black/55"
            style={{ color }}
          >
            <RoleIcon className="w-2.5 h-2.5" />
            {ROLE_LABELS[role] || 'Miembro'}
          </span>
        </div>
        {puntosBR ? (
          <div className="text-right shrink-0">
            <p className="font-mono font-bold text-[13px] text-elite-ice leading-none">
              {puntosBR.toLocaleString('es')}
            </p>
            <p className="text-[8px] font-semibold tracking-[0.13em] text-white/30">
              PUNTOS
            </p>
          </div>
        ) : null}
      </div>

      {/* Level + UID */}
      <div className="flex items-end justify-between mb-2.5">
        <span
          className="font-display font-extrabold text-[11px] text-elite-dark
                     pl-2.5 pr-4 py-0.5"
          style={{
            background: `linear-gradient(100deg, ${color}, ${color}99)`,
            clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
          }}
        >
          Nvl. {member.level || '—'}
        </span>
        {member.free_fire_id ? (
          <span className="font-mono text-[10px] text-white/25">
            UID {member.free_fire_id}
          </span>
        ) : null}
      </div>

      {/* Mode stripe */}
      <div
        className="flex items-center gap-2 mb-3 px-2.5 py-1 font-display
                   text-[10px] font-bold tracking-[0.13em] text-white/65"
        style={{
          borderLeft: `2px solid ${color}`,
          background: `linear-gradient(90deg, ${color}1f, transparent)`,
        }}
      >
        ⇄ BATTLE ROYALE
      </div>

      {/* Three stats */}
      <div className="grid grid-cols-3 gap-px mb-3 bg-white/[0.07]">
        {[
          { k: 'Kills', v: member.kills, fmt: (n: number) => n.toLocaleString('es'), on: false },
          { k: 'A la cabeza', v: member.headshot_tasa, fmt: (n: number) => `${n.toFixed(1)}%`, on: true },
          { k: 'K/D', v: member.kd_ratio, fmt: (n: number) => n.toFixed(2), on: false },
        ].map((c) => (
          <div
            key={c.k}
            className="px-1 py-2 text-center bg-elite-dark/70
                       group-hover:bg-white/[0.04] transition-colors"
          >
            <p className="text-[8px] uppercase tracking-[0.14em] text-white/35">{c.k}</p>
            <p
              className="font-mono font-bold text-[15px] tabular-nums text-elite-ice"
              style={c.on ? { color, textShadow: `0 0 14px ${color}88` } : undefined}
            >
              {c.v != null ? c.fmt(Number(c.v)) : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Emblems + Elite Coins + Top Weapon */}
      <div className="flex items-center gap-2.5">
        <EmblemaRango
          imagen={member.emblema_br_url}
          puntos={puntosBR}
          temporada={member.temporada_br}
          size={50}
          className="shrink-0"
          prioritaria={index < 8}
        />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-[12px] text-elite-ice leading-tight">
            {member.rank || 'Heroico'}
          </p>
          {member.temporada_br ? (
            <p className="text-[8.5px] uppercase tracking-[0.12em] text-white/30">
              Temp. {String(member.temporada_br).replace(/^S/i, '')}
            </p>
          ) : null}
        </div>
        {member.coins != null && member.coins > 0 && (
          <div className="flex items-center gap-1.5 pl-1.5 pr-2 py-1
                          border border-elite-gold/30 bg-elite-gold/[0.08]
                          relative overflow-hidden group/coins shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-elite-gold/0 via-elite-gold/10 to-elite-gold/0
                            translate-x-[-100%] group-hover/coins:translate-x-[100%]
                            transition-transform duration-700 ease-out pointer-events-none" />
            <span className="moneda-elite shrink-0 relative z-10" aria-hidden />
            <span className="relative z-10">
              <span className="block font-mono font-bold text-[11px] leading-none text-elite-gold">
                {member.coins.toLocaleString('es')}
              </span>
              <span className="block text-[6px] font-semibold tracking-[0.1em] text-elite-gold/50">
                COINS
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Arma favorita */}
      {(() => {
        const topWeapon = getTopWeapon(member)
        if (!topWeapon) return null
        return (
          <div className="flex items-center gap-2 mt-2 px-3 py-2
                          bg-gradient-to-r from-elite-primary/5 to-transparent
                          border border-elite-primary/15 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-elite-primary/40" />
            <span className="text-[8px] uppercase tracking-[0.14em] text-elite-primary/60 font-semibold shrink-0">
              Arma favorita
            </span>
            <span className="font-display font-bold text-[11px] text-elite-ice ml-auto truncate">
              {topWeapon.name}
            </span>
          </div>
        )
      })()}
    </motion.div>
  )
}
