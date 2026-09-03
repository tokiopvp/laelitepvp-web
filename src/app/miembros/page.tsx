'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { Member } from '@/lib/types'
import { useMembers } from '@/lib/hooks'
import MemberCard from '@/components/miembros/MemberCard'
import OutfitModal from '@/components/OutfitModal'
import { MemberGridSkeleton } from '@/components/Skeletons'
import Resplandor from '@/components/layout/Resplandor'

const ROLE_ORDER: Record<string, number> = { leader: 0, interim_leader: 1, elder: 2, member: 3 }

export default function MiembrosPage() {
  const { members, loading } = useMembers()
  const [verOutfit, setVerOutfit] = useState<Member | null>(null)

  const miembrosOrdenados = useMemo(() => {
    const byRole: Record<string, Member[]> = { leader: [], interim_leader: [], elder: [], member: [] }
    for (const m of members) {
      const r = m.role_in_clan || 'member'
      ;(byRole[r] || byRole.member).push(m)
    }
    const sortMembers = (list: Member[]) =>
      [...list].sort((a, b) => {
        const coinsA = a.coins ?? 0
        const coinsB = b.coins ?? 0
        const hasEliteA = coinsA >= 50000 ? 1 : 0
        const hasEliteB = coinsB >= 50000 ? 1 : 0
        if (hasEliteA !== hasEliteB) return hasEliteB - hasEliteA
        return (b.kills ?? 0) - (a.kills ?? 0)
      })
    return [
      ...sortMembers(byRole.leader),
      ...sortMembers(byRole.interim_leader),
      ...sortMembers(byRole.elder),
      ...sortMembers(byRole.member),
    ]
  }, [members])

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
          <img src="/free-fire-logo.png" alt="" className="h-7 w-auto opacity-80 mx-auto mb-3" />
          <h1 className="font-display font-black text-5xl sm:text-7xl uppercase title-premium mb-3">
            Miembros Elite
          </h1>
          <motion.p
            className="text-white/60 text-lg font-medium tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            El 1% de Free Fire. <span className="text-elite-primary">Poder silencioso</span>, <span className="text-elite-gold">Control absoluto.</span>
          </motion.p>
        </motion.div>

        {loading && members.length === 0 ? (
          <MemberGridSkeleton />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {miembrosOrdenados.map((member, i) => (
              <MemberCard
                key={member.id}
                member={member}
                index={i}
                onClick={setVerOutfit}
              />
            ))}
          </div>
        )}
      </div>
      <OutfitModal member={verOutfit} onClose={() => setVerOutfit(null)} />
    </div>
  )
}
