'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Trophy, Target, Star, Zap, Crown, Medal } from 'lucide-react'
import { Member } from '@/lib/types'
import { getMembers, subscribeToTable } from '@/lib/data'
import { demoMembers } from '@/lib/demo-data'
import { cn } from '@/lib/utils'

type Category = 'kd' | 'headshots' | 'wins' | 'booyahs' | 'level'

const categories: { key: Category; label: string; icon: any; value: (m: Member) => number; suffix?: string }[] = [
  { key: 'kd', label: 'K/D Ratio', icon: Zap, value: (m) => m.kd_ratio, suffix: '' },
  { key: 'headshots', label: 'Headshots', icon: Target, value: (m) => m.headshots },
  { key: 'wins', label: 'Victorias', icon: Trophy, value: (m) => m.wins },
  { key: 'booyahs', label: 'Booyahs', icon: Flame, value: (m) => m.booyahs },
  { key: 'level', label: 'Nivel', icon: Star, value: (m) => m.level },
]

const rankColors = ['#ffd700', '#c0c0c0', '#cd7f32', '#00d4ff', '#7c3aed']

export default function TopsPage() {
  const [members, setMembers] = useState<Member[]>(demoMembers)
  const [activeCat, setActiveCat] = useState<Category>('kd')
  const cat = categories.find((c) => c.key === activeCat)!

  useEffect(() => {
    getMembers().then(setMembers)
    const unsub = subscribeToTable('members', () => {
      getMembers().then(setMembers)
    })
    return unsub
  }, [])

  const ranked = [...members].sort((a, b) => cat.value(b) - cat.value(a)).slice(0, 10)

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-elite-secondary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="section-container">
        <motion.div initial={{ y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-gold/10 border border-elite-gold/30 mb-4">
            <Crown className="w-4 h-4 text-elite-gold" />
            <span className="text-sm font-medium text-elite-gold">TOPS EN VIVO</span>
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl gradient-text mb-2">Rankings Elite</h1>
          <p className="text-white/60">Los mejores del clan, actualizado en tiempo real.</p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map((c) => {
            const Icon = c.icon
            return (
              <button
                key={c.key}
                onClick={() => setActiveCat(c.key)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all',
                  activeCat === c.key
                    ? 'bg-gradient-to-r from-elite-primary to-elite-secondary text-white shadow-lg shadow-elite-primary/25'
                    : 'bg-elite-card border border-elite-border text-white/70 hover:border-elite-primary/50'
                )}
              >
                <Icon className="w-4 h-4" />
                {c.label}
              </button>
            )
          })}
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          <AnimatePresence mode="popLayout">
            {ranked.map((member, i) => (
              <motion.div
                key={member.id}
                layout
                initial={{ x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ x: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="card-glow flex items-center gap-4 p-4"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-xl"
                  style={{
                    backgroundColor: i < 3 ? `${rankColors[i]}20` : 'rgba(255,255,255,0.05)',
                    color: i < 3 ? rankColors[i] : '#fff',
                  }}
                >
                  {i === 0 ? <Medal className="w-6 h-6" /> : i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-display font-bold text-lg">{member.nickname}</p>
                  <p className="text-white/50 text-sm">{member.rank} • Nv {member.level}</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-2xl gradient-text">
                    {cat.value(member).toLocaleString()}{cat.suffix}
                  </p>
                  <p className="text-white/40 text-xs">{cat.label}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
