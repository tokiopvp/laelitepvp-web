'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminGuard, AdminHeader } from '@/components/admin/AdminGuard'
import { getMembers } from '@/lib/data'
import { Member } from '@/lib/types'

const cats = [
  { key: 'kd_ratio', label: 'K/D Ratio' },
  { key: 'headshots', label: 'Headshots' },
  { key: 'wins', label: 'Victorias' },
  { key: 'booyahs', label: 'Booyahs' },
  { key: 'level', label: 'Nivel' },
] as const

function TopsAdmin() {
  const [members, setMembers] = useState<Member[]>([])
  const [active, setActive] = useState<typeof cats[number]['key']>('kd_ratio')

  useEffect(() => { getMembers().then(setMembers) }, [])
  const ranked = [...members].sort((a, b) => (b[active] as number) - (a[active] as number)).slice(0, 15)

  return (
    <div className="min-h-screen pt-24 pb-16 section-container">
      <AdminHeader title="Tops & Rankings" subtitle="Rankings calculados en vivo desde los stats de miembros" />
      <div className="flex flex-wrap gap-2 mb-6">
        {cats.map((c) => (
          <button key={c.key} onClick={() => setActive(c.key)}
            className={active === c.key ? 'btn-primary' : 'btn-secondary'}>{c.label}</button>
        ))}
      </div>
      <div className="space-y-2">
        {ranked.map((m, i) => (
          <div key={m.id} className="card-glow p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-elite-gold w-8">#{i + 1}</span>
              <span className="font-display font-bold">{m.nickname}</span>
            </div>
            <span className="gradient-text font-bold text-xl">{(m[active] as number).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <p className="text-white/40 text-sm mt-6">Editá los stats de un miembro en <Link href="/admin/miembros" className="text-elite-primary hover:underline">Miembros</Link> y los rankings se recalculan solos.</p>
    </div>
  )
}

export default function Page() {
  return <AdminGuard><TopsAdmin /></AdminGuard>
}
