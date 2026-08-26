'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Coins, Crown, Medal } from 'lucide-react'
import { getLeaderboard, getMembers } from '@/lib/data'
import type { Profile, Member } from '@/lib/types'

const RANK_BADGE = (i: number) => {
  if (i === 0) return <Crown className="w-5 h-5 text-elite-gold" />
  if (i === 1) return <Medal className="w-5 h-5 text-gray-300" />
  if (i === 2) return <Medal className="w-5 h-5 text-amber-600" />
  return <span className="w-5 text-center text-white/40 font-bold">{i + 1}</span>
}

export default function ComunidadPage() {
  const [players, setPlayers] = useState<Profile[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [load, setLoad] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [board, mem] = await Promise.all([getLeaderboard(50), getMembers()])
      if (!alive) return
      setPlayers(board)
      setMembers(mem)
      setLoad(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  const nick = (p: Profile) => {
    if (p.member_id) {
      const m = members.find((x) => x.id === p.member_id)
      if (m) return m.nickname
    }
    return p.display_name || p.username || 'Jugador'
  }

  return (
    <div className="min-h-screen pt-28 pb-24">
      <div className="section-container max-w-3xl">
        <motion.div initial={{ y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-secondary/10 border border-elite-secondary/30 mb-4">
            <Trophy className="w-4 h-4 text-elite-secondary" />
            <span className="text-sm font-medium text-elite-secondary">RANKING DE LA COMUNIDAD</span>
          </div>
          <h1 className="font-display font-bold text-4xl gradient-text mb-2">Elite Coin Leaderboard</h1>
          <p className="text-white/60">Gana puntos con check-in diario y vinculando tu cuenta. Solo diversión sana.</p>
        </motion.div>

        {load ? (
          <p className="text-center text-white/40">Cargando…</p>
        ) : players.length === 0 ? (
          <div className="card-glow p-10 text-center text-white/50">
            <Coins className="w-10 h-10 mx-auto mb-3 text-elite-gold" />
            Aún no hay puntos. ¡Inicia sesión y haz tu primer check-in!
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="card-glow p-4 flex items-center gap-4"
              >
                <div className="w-8 flex justify-center">{RANK_BADGE(i)}</div>
                <div className="flex-1">
                  <p className="font-display font-bold text-lg">{nick(p)}</p>
                  {p.is_member && <span className="text-xs text-elite-primary">Miembro del clan</span>}
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-2xl gradient-text">{p.points}</p>
                  <p className="text-white/40 text-xs">Elite Coin</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
