'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Coins, CalendarCheck, Link2, Trophy, LogIn, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { getMyProfile, dailyCheckin, linkMember, getPointEvents, getMembers } from '@/lib/data'
import type { Profile, PointEvent, Member } from '@/lib/types'

const RANK_COLORS: Record<string, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Platinum: '#e5e4e2',
  Diamond: '#b9f2ff',
  Master: '#ff6b6b',
  Grandmaster: '#c77dff',
}

export default function MiPage() {
  const { user, loading, isAuthed, signIn } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [events, setEvents] = useState<PointEvent[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [ffid, setFfid] = useState('')
  const [linking, setLinking] = useState(false)
  const [linkMsg, setLinkMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [checking, setChecking] = useState(false)
  const [load, setLoad] = useState(true)

  useEffect(() => {
    if (loading) return
    if (!isAuthed) {
      setLoad(false)
      return
    }
    let alive = true
    ;(async () => {
      const p = await getMyProfile()
      if (!alive) return
      setProfile(p)
      const [ev, mem] = await Promise.all([getPointEvents(), getMembers()])
      if (!alive) return
      setEvents(ev)
      setMembers(mem)
      setLoad(false)
    })()
    return () => {
      alive = false
    }
  }, [isAuthed, loading])

  const linkedMember: Member | undefined = profile?.member_id
    ? members.find((m) => m.id === profile.member_id)
    : undefined

  const alreadyCheckedIn = profile?.last_checkin
    ? new Date(profile.last_checkin).toDateString() === new Date().toDateString()
    : false

  const onLink = async () => {
    if (!ffid.trim()) return
    setLinking(true)
    setLinkMsg(null)
    const ok = await linkMember(ffid.trim())
    if (ok) {
      setLinkMsg({ ok: true, text: '¡Vinculado! Ganaste +20 puntos de bienvenida.' })
      setProfile(await getMyProfile())
      setEvents(await getPointEvents())
    } else {
      setLinkMsg({ ok: false, text: 'No encontramos ese ID en el clan. Revisa tu Free Fire ID.' })
    }
    setLinking(false)
  }

  const onCheckin = async () => {
    setChecking(true)
    const pts = await dailyCheckin()
    if (pts !== null) {
      setProfile(await getMyProfile())
      setEvents(await getPointEvents())
    }
    setChecking(false)
  }

  if (loading || load) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-elite-primary" />
      </div>
    )
  }

  if (!isAuthed) {
    return (
      <div className="min-h-screen pt-32 pb-24 section-container">
        <motion.div initial={{ y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-glow p-10 max-w-lg mx-auto text-center">
          <LogIn className="w-12 h-12 mx-auto mb-4 text-elite-primary" />
          <h1 className="font-display font-bold text-3xl gradient-text mb-3">Mi Cuenta</h1>
          <p className="text-white/60 mb-6">Inicia sesión con Discord para ver tu perfil, tus puntos y participar en la comunidad.</p>
          <button onClick={() => signIn()} className="btn-primary justify-center w-full">
            <LogIn className="w-4 h-4" /> Entrar con Discord
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-28 pb-24">
      <div className="section-container max-w-4xl">
        <motion.div initial={{ y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display font-bold text-4xl gradient-text mb-1">Mi Cuenta</h1>
          <p className="text-white/50">Bienvenido, {profile?.display_name || user?.email}</p>
        </motion.div>

        {/* Banner estilo perfil de juego */}
        <div className="relative rounded-2xl overflow-hidden border border-elite-border card-glow mb-6">
          <div
            className="h-28 sm:h-32"
            style={{
              background: linkedMember
                ? `linear-gradient(90deg, ${RANK_COLORS[linkedMember.rank || 'Bronze']}55, #7c3aed33, #00d4ff44)`
                : 'linear-gradient(90deg, #00d4ff44, #7c3aed44)',
            }}
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px)', backgroundSize: '22px 22px' }}
          />
          <div className="relative -mt-12 sm:-mt-14 flex flex-col sm:flex-row items-center sm:items-end gap-4 px-6 pb-6">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-display font-bold text-white shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #00d4ff, #7c3aed)',
                boxShadow: linkedMember ? `0 0 0 4px ${RANK_COLORS[linkedMember.rank || 'Bronze']}` : '0 0 0 4px #0a0a0f',
              }}
            >
              {(linkedMember?.nickname || profile?.display_name || '?').slice(0, 2).toUpperCase()}
            </div>
            <div className="text-center sm:text-left">
              <h2 className="font-display font-bold text-2xl">{linkedMember?.nickname || profile?.display_name || 'Jugador'}</h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1 text-sm text-white/60">
                {linkedMember?.rank && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${RANK_COLORS[linkedMember.rank] || '#888'}22`, color: RANK_COLORS[linkedMember.rank] || '#fff' }}>
                    {linkedMember.rank}
                  </span>
                )}
                {linkedMember?.role_in_clan && <span className="capitalize">{linkedMember.role_in_clan}</span>}
                {profile?.is_member && <span className="text-elite-primary">◆ Miembro del clan</span>}
              </div>
            </div>
            <div className="sm:ml-auto flex items-center gap-2 bg-elite-gold/10 border border-elite-gold/30 px-4 py-2 rounded-full">
              <Coins className="w-4 h-4 text-elite-gold" />
              <span className="font-bold text-elite-gold">{profile?.points ?? 0}</span>
              <span className="text-white/60 text-sm">Elite Coin</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          {/* Puntos */}
          <div className="card-glow p-6 text-center">
            <Coins className="w-8 h-8 mx-auto mb-2 text-elite-gold" />
            <p className="text-white/50 text-sm">Elite Coin</p>
            <p className="font-display font-bold text-3xl gradient-text">{profile?.points ?? 0}</p>
          </div>

          {/* Check-in */}
          <div className="card-glow p-6 text-center flex flex-col justify-center">
            <CalendarCheck className="w-8 h-8 mx-auto mb-2 text-elite-primary" />
            <button
              onClick={onCheckin}
              disabled={alreadyCheckedIn || checking}
              className={alreadyCheckedIn ? 'btn-secondary justify-center w-full opacity-70' : 'btn-primary justify-center w-full'}
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : alreadyCheckedIn ? <CheckCircle2 className="w-4 h-4" /> : 'Check-in diario (+10)'}
            </button>
            {alreadyCheckedIn && <p className="text-white/40 text-xs mt-2">Ya canjeaste hoy. ¡Vuelve mañana!</p>}
          </div>

          {/* Ranking */}
          <div className="card-glow p-6 text-center flex flex-col justify-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-elite-secondary" />
            <Link href="/comunidad" className="btn-secondary justify-center w-full">
              <Trophy className="w-4 h-4" /> Ver ranking
            </Link>
          </div>
        </div>

        {/* Vinculación */}
        <div className="card-glow p-6 mb-6">
          <h2 className="font-display font-bold text-xl mb-3 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-elite-primary" /> Vinculación con el clan
          </h2>
          {linkedMember ? (
            <div className="flex items-center gap-3 text-elite-gold">
              <CheckCircle2 className="w-5 h-5" />
              <span>Vinculado como <b>{linkedMember.nickname}</b> (ID: {linkedMember.free_fire_id})</span>
            </div>
          ) : (
            <>
              <p className="text-white/60 text-sm mb-3">
                Ingresa tu Free Fire ID para vincular tu cuenta y ver tus stats reales del clan.
              </p>
              <div className="flex flex-wrap gap-3">
                <input
                  className="input flex-1 min-w-[200px]"
                  placeholder="Tu ID de Free Fire"
                  value={ffid}
                  onChange={(e) => setFfid(e.target.value)}
                />
                <button onClick={onLink} disabled={linking} className="btn-primary justify-center">
                  {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Vincular'}
                </button>
              </div>
              {linkMsg && (
                <p className={`text-sm mt-3 flex items-center gap-2 ${linkMsg.ok ? 'text-elite-gold' : 'text-red-400'}`}>
                  {linkMsg.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {linkMsg.text}
                </p>
              )}
            </>
          )}
        </div>

        {/* Stats del clan */}
        {linkedMember && (
          <div className="card-glow p-6 mb-6">
            <h2 className="font-display font-bold text-xl mb-4">Tus stats del clan</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'K/D', value: linkedMember.kd_ratio },
                { label: 'Headshots', value: linkedMember.headshots },
                { label: 'Victorias', value: linkedMember.wins },
                { label: 'Booyahs', value: linkedMember.booyahs },
              ].map((s) => (
                <div key={s.label} className="bg-elite-card border border-elite-border rounded-xl p-4 text-center">
                  <p className="text-white/50 text-xs">{s.label}</p>
                  <p className="font-display font-bold text-xl gradient-text">{s.value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial */}
        <div className="card-glow p-6">
          <h2 className="font-display font-bold text-xl mb-4">Historial de puntos</h2>
          {events.length === 0 ? (
            <p className="text-white/40 text-sm">Aún no tienes movimientos. ¡Haz check-in para empezar!</p>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <div key={e.id} className="flex items-center justify-between bg-elite-card border border-elite-border rounded-lg px-4 py-3">
                  <span className="capitalize text-white/80">
                    {e.type === 'checkin' ? 'Check-in diario' : 'Vinculación de cuenta'}
                  </span>
                  <span className="text-elite-gold font-bold">+{e.amount}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
