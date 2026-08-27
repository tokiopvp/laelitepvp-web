'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Coins, CalendarCheck, Link2, Trophy, LogIn, Loader2, CheckCircle2, XCircle, Target, Flag } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { getMyProfile, dailyCheckin, linkMember, getPointEvents, getMembers, getChallenges, checkChallenges, getMyChallengeCompletions } from '@/lib/data'
import type { Profile, PointEvent, Member } from '@/lib/types'
import type { Challenge } from '@/lib/data'

const METRIC_LABEL: Record<string, string> = {
  kd_ratio: 'K/D',
  headshots: 'Headshots',
  wins: 'Victorias',
  booyahs: 'Booyahs',
  kills: 'Kills',
  winrate: 'Win Rate %',
  partidas: 'Partidas',
  max_kills: 'Max Kills',
  revividas: 'Revividas',
  dano_partida: 'Daño / partida',
  headshot_tasa: 'Tasa HS %',
  top10_tasa: 'Tasa Top 10 %',
  kpp: 'Kills / partida',
}

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
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [completions, setCompletions] = useState<Set<string>>(new Set())
  const [checkingCh, setCheckingCh] = useState(false)
  const [chMsg, setChMsg] = useState<string | null>(null)

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
      const [ev, mem, ch, comp] = await Promise.all([
        getPointEvents(),
        getMembers(),
        getChallenges(),
        getMyChallengeCompletions(),
      ])
      if (!alive) return
      setEvents(ev)
      setMembers(mem)
      setChallenges(ch)
      setCompletions(comp)
      setLoad(false)
    })()
    return () => {
      alive = false
    }
  }, [isAuthed, loading])

  // Verifica retos automaticamente al entrar (si esta vinculado, la RPC premia los cumplidos).
  const runChallenges = async () => {
    const awarded = await checkChallenges()
    if (awarded && awarded > 0) {
      setProfile(await getMyProfile())
      setCompletions(await getMyChallengeCompletions())
      setChMsg(`¡Reto completado! +${awarded} Elite Coin`)
    } else {
      setChMsg(null)
    }
  }
  useEffect(() => {
    if (isAuthed && profile?.is_member) runChallenges()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, profile?.is_member])

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
      setCompletions(await getMyChallengeCompletions())
      runChallenges()
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

        {/* Banner estilo perfil de juego (automatico: usa la imagen que escanea el bot) */}
        <div className="relative rounded-2xl overflow-hidden border border-elite-border card-glow mb-6">
          {linkedMember?.outfit_image_url ? (
            <div className="h-28 sm:h-32 bg-cover bg-center" style={{ backgroundImage: `url(${linkedMember.outfit_image_url})` }} />
          ) : (
            <div
              className="h-28 sm:h-32"
              style={{
                background: linkedMember
                  ? `linear-gradient(90deg, ${(linkedMember.rank ? RANK_COLORS[linkedMember.rank] : null) || '#6b6156'}55, #ff4d6833, #e11d3c44)`
                  : 'linear-gradient(90deg, #e11d3c44, #ff4d6844)',
              }}
            />
          )}
          <div
            className="absolute inset-0 opacity-30"
            style={{ background: 'linear-gradient(180deg, transparent 40%, #0d0b09 100%), radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px)', backgroundSize: 'auto, 22px 22px' }}
          />
          <div className="relative -mt-12 sm:-mt-14 flex flex-col sm:flex-row items-center sm:items-end gap-4 px-6 pb-6">
            {linkedMember?.avatar_url || linkedMember?.outfit_image_url ? (
              <img
                src={linkedMember.avatar_url || linkedMember.outfit_image_url || ''}
                alt=""
                className="w-24 h-24 rounded-2xl object-cover shadow-lg"
                style={{ boxShadow: linkedMember ? `0 0 0 4px ${(linkedMember.rank ? RANK_COLORS[linkedMember.rank] : null) || '#6b6156'}` : '0 0 0 4px #0d0b09' }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-display font-bold text-white shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #e11d3c, #ff4d68)',
                  boxShadow: linkedMember ? `0 0 0 4px ${(linkedMember.rank ? RANK_COLORS[linkedMember.rank] : null) || '#6b6156'}` : '0 0 0 4px #0d0b09',
                }}
              >
                {(linkedMember?.nickname || profile?.display_name || '?').slice(0, 2).toUpperCase()}
              </div>
            )}
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

        {/* Retos / Objetivos (Fase 2) */}
        <div className="card-glow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl flex items-center gap-2">
              <Target className="w-5 h-5 text-elite-primary" /> Retos y Objetivos
            </h2>
            <button
              onClick={async () => {
                setCheckingCh(true)
                const awarded = await checkChallenges()
                setProfile(await getMyProfile())
                setCompletions(await getMyChallengeCompletions())
                setCheckingCh(false)
                setChMsg(awarded && awarded > 0 ? `¡Reto completado! +${awarded} Elite Coin` : 'No hay retos nuevos por ahora')
              }}
              disabled={checkingCh || !profile?.is_member}
              className="btn-secondary text-sm justify-center disabled:opacity-50"
            >
              {checkingCh ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
              Verificar retos
            </button>
          </div>
          {!profile?.is_member && (
            <p className="text-white/50 text-sm mb-3">Vincula tu cuenta con tu Free Fire ID para participar en los retos.</p>
          )}
          {chMsg && <p className="text-sm text-elite-gold mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{chMsg}</p>}
          <div className="space-y-3">
            {challenges.length === 0 && <p className="text-white/40 text-sm">No hay retos disponibles.</p>}
            {challenges.map((c) => {
              const current = linkedMember ? (linkedMember as any)[c.metric] ?? 0 : 0
              const target = c.target
              const done = completions.has(c.id) || (typeof current === 'number' && current >= target)
              const pct = Math.min(100, target ? (current / target) * 100 : 0)
              return (
                <div key={c.id} className="bg-elite-card border border-elite-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="text-white/50 text-xs">{c.description}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${done ? 'bg-elite-gold/20 text-elite-gold' : 'bg-elite-primary/10 text-elite-primary'}`}>
                        {done ? 'Completado' : `+${c.points}`}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-elite-dark overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-elite-primary to-elite-secondary" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-white/40 text-xs mt-1">
                    {METRIC_LABEL[c.metric] || c.metric}: {current} / {target}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

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
