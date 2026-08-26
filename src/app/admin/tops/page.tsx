'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'
import { getMembers } from '@/lib/data'
import { Member } from '@/lib/types'
import { STAT_CATEGORIES, formatStat } from '@/lib/stats'

function TopsAdmin() {
  const [members, setMembers] = useState<Member[]>([])
  const [active, setActive] = useState<string>(STAT_CATEGORIES[0].key)

  useEffect(() => { getMembers().then(setMembers) }, [])
  const cat = STAT_CATEGORIES.find((c) => c.key === active) ?? STAT_CATEGORIES[0]
  const valOf = (m: Member) => {
    const v = cat.get(m)
    return v == null ? -Infinity : v
  }
  const ranked = [...members].sort((a, b) => valOf(b) - valOf(a)).slice(0, 15)

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="Tops & Rankings" subtitle="Rankings calculados en vivo desde los stats de miembros" />
      <div className="flex flex-wrap gap-2 mb-6">
        {STAT_CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setActive(c.key)}
            className={active === c.key ? 'btn-primary' : 'btn-secondary'}>{c.label}</button>
        ))}
      </div>
      <div className="space-y-2">
        {ranked.map((m, i) => {
            const raw = cat.get(m)
          return (
            <div key={m.id} className="card-glow p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-elite-gold w-8">#{i + 1}</span>
                <span className="font-display font-bold">{m.nickname}</span>
              </div>
              <span className="gradient-text font-bold text-xl">{formatStat(raw, cat)}</span>
            </div>
          )
        })}
      </div>
      <p className="text-white/40 text-sm mt-6">Editá los stats de un miembro en <Link href="/admin/miembros" className="text-elite-primary hover:underline">Miembros</Link> y los rankings se recalculan solos.</p>
    </div>
  )
}

export default function Page() {
  return <AdminGuard><TopsAdmin /></AdminGuard>
}
