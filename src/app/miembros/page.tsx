'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users } from 'lucide-react'
import { Member } from '@/lib/types'
import { useMembers } from '@/lib/hooks'
import MemberCard from '@/components/miembros/MemberCard'
import OutfitModal from '@/components/OutfitModal'
import { MemberGridSkeleton } from '@/components/Skeletons'
import Resplandor from '@/components/layout/Resplandor'

export default function MiembrosPage() {
  const { members, loading } = useMembers()
  const [verOutfit, setVerOutfit] = useState<Member | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroRango, setFiltroRango] = useState<string>('todos')
  const [ordenarPor, setOrdenarPor] = useState<string>('nombre')

  const miembrosFiltrados = members
    .filter((m) => {
      if (busqueda && !m.nickname.toLowerCase().includes(busqueda.toLowerCase())) return false
      if (filtroRango !== 'todos' && m.role_in_clan !== filtroRango) return false
      return true
    })
    .sort((a, b) => {
      switch (ordenarPor) {
        case 'nivel': return (b.level || 0) - (a.level || 0)
        case 'kd': return (b.kd_ratio || 0) - (a.kd_ratio || 0)
        case 'kills': return (b.kills ?? 0) - (a.kills ?? 0)
        case 'headshot': return (b.headshot_tasa ?? 0) - (a.headshot_tasa ?? 0)
        default: return a.nickname.localeCompare(b.nickname)
      }
    })

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

        {/* Barra de búsqueda y filtros */}
        <div className="mb-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
          <div className="relative w-full sm:w-72">
            <input
              type="search"
              placeholder="Buscar miembro..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input pl-10"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={filtroRango}
            onChange={(e) => setFiltroRango(e.target.value)}
            className="input w-auto"
          >
            <option value="todos">Todos los rangos</option>
            <option value="leader">Líder</option>
            <option value="interim_leader">Interino</option>
            <option value="elder">Decano</option>
            <option value="member">Miembro</option>
          </select>
          <select
            value={ordenarPor}
            onChange={(e) => setOrdenarPor(e.target.value)}
            className="input w-auto"
          >
            <option value="nombre">Nombre</option>
            <option value="nivel">Nivel</option>
            <option value="kd">K/D</option>
            <option value="kills">Kills</option>
            <option value="headshot">Headshot %</option>
          </select>
        </div>

        {loading && members.length === 0 ? (
          <MemberGridSkeleton />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {miembrosFiltrados.map((member, i) => (
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
