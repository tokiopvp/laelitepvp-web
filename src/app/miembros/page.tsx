'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, Swords } from 'lucide-react'
import { Member } from '@/lib/types'
import { useMembers } from '@/lib/hooks'
import MemberCard from '@/components/miembros/MemberCard'
import OutfitModal from '@/components/OutfitModal'
import { MemberGridSkeleton } from '@/components/Skeletons'
import Resplandor from '@/components/layout/Resplandor'

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

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
    return [
      ...shuffleArray(byRole.leader),
      ...shuffleArray(byRole.interim_leader),
      ...shuffleArray(byRole.elder),
      ...shuffleArray(byRole.member),
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
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/free-fire-logo.png" alt="" className="h-6 w-auto opacity-70" />
            <h1 className="font-display font-black text-5xl sm:text-7xl uppercase title-premium">
              Miembros Elite
            </h1>
            <img src="/free-fire-logo.png" alt="" className="h-6 w-auto opacity-70" />
          </div>
          <p className="text-white/50 text-lg">El squad más letal de Free Fire. Cada uno una leyenda.</p>
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
