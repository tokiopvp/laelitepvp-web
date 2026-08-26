'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Flame, Trophy, Users, Star, Skull } from 'lucide-react'
import { Member } from '@/lib/types'
import { getMembers, subscribeToTable } from '@/lib/data'
import { demoMembers } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

const RANK_COLORS: Record<string, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Platinum: '#e5e4e2',
  Diamond: '#b9f2ff',
  Master: '#ff6b6b',
  Grandmaster: '#c77dff',
}

const ROLE_ICONS: Record<string, any> = {
  leader: Crown,
  'co-leader': Flame,
  elder: Star,
  member: Skull,
}

export default function MiembrosPage() {
  const [members, setMembers] = useState<Member[]>(demoMembers)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true
    const load = () => getMembers().then((m) => {
      if (!active) return
      setMembers(m)
      setLoading(false)
    })
    load()
    const unsub = subscribeToTable('members', load)
    const id = setInterval(load, 20000)
    return () => {
      active = false
      clearInterval(id)
      unsub()
    }
  }, [])

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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {members.map((member, i) => {
            const RoleIcon = ROLE_ICONS[member.role_in_clan || 'member'] || Skull
            return (
              <motion.div
                key={member.id}
                className="card-glow p-6 group"
                initial={{ y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -8 }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-elite-primary/20 to-elite-secondary/20 flex items-center justify-center text-2xl font-display font-bold gradient-text">
                      {member.nickname.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-elite-dark border border-elite-border flex items-center justify-center">
                      <RoleIcon className="w-4 h-4 text-elite-gold" />
                    </div>
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${RANK_COLORS[member.rank || 'Bronze']}20`, color: RANK_COLORS[member.rank || 'Bronze'] }}
                  >
                    {member.rank || '—'}
                  </div>
                </div>

                <h3 className="font-display font-bold text-xl mb-1">{member.nickname}</h3>
                <p className="text-white/50 text-sm mb-4 capitalize">{member.role_in_clan}</p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-elite-dark/50 rounded-lg p-3">
                    <p className="text-white/50 text-xs">K/D</p>
                    <p className="font-bold gradient-text text-lg">{member.kd_ratio ?? '—'}</p>
                  </div>
                  <div className="bg-elite-dark/50 rounded-lg p-3">
                    <p className="text-white/50 text-xs">Nivel</p>
                    <p className="font-bold text-lg">{member.level}</p>
                  </div>
                  <div className="bg-elite-dark/50 rounded-lg p-3">
                    <p className="text-white/50 text-xs flex items-center gap-1"><Flame className="w-3 h-3" /> HS</p>
                    <p className="font-bold text-lg">{member.headshots == null ? '—' : member.headshots.toLocaleString()}</p>
                  </div>
                  <div className="bg-elite-dark/50 rounded-lg p-3">
                    <p className="text-white/50 text-xs flex items-center gap-1"><Trophy className="w-3 h-3" /> Wins</p>
                    <p className="font-bold text-lg">{member.wins == null ? '—' : member.wins.toLocaleString()}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
