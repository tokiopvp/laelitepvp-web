'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Coins, CalendarCheck, Trophy, LogIn, Loader2, CheckCircle2, Target, Flag } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { getMyProfile, dailyCheckin, getPointEvents, getMember, getChallenges, checkChallenges, getMyChallengeCompletions } from '@/lib/data'
import type { Profile, PointEvent, Member } from '@/lib/types'
import type { Challenge } from '@/lib/data'
import MiVinculacion from '@/components/mi/MiVinculacion'
import { RANK_COLORS } from '@/lib/rangos'
import { cn } from '@/lib/utils'

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

// Las etiquetas son constantes: no dependen de nada del render y no tienen
// por que rehacerse en cada uno.
const MODOS_ETIQUETAS: Record<string, string> = {
  solo: 'Solo',
  duo: 'Dúo',
  escuadra: 'Escuadra',
}

const MODOS_RANKED = ['solo', 'duo', 'escuadra'] as const

export default function MiPage() {
  const { user, loading, isAuthed, signIn } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [events, setEvents] = useState<PointEvent[]>([])
  const [miembro, setMiembro] = useState<Member | null>(null)
  const [checking, setChecking] = useState(false)
  const [load, setLoad] = useState(true)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [completions, setCompletions] = useState<Set<string>>(new Set())
  const [checkingCh, setCheckingCh] = useState(false)
  const [chMsg, setChMsg] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [modoActual, setModoActual] = useState<'solo' | 'duo' | 'escuadra'>('solo')

  useEffect(() => {
    if (loading) return
    if (!isAuthed) {
      setLoad(false)
      return
    }
    let alive = true
    ;(async () => {
      // Las cuatro consultas van A LA VEZ. Antes el perfil se pedia SOLO y las
      // demas esperaban a que volviera, aunque ninguna dependa de el: eran dos
      // viajes al servidor en serie con la pantalla en blanco.
      // `allSettled` y no `all`.
      //
      // Con `Promise.all`, si UNA de las cuatro consultas falla, la promesa
      // entera se rechaza: `setLoad(false)` no se ejecuta y la pantalla se
      // queda con la rueda girando para siempre. Y no hacen falta las cuatro
      // para pintar algo util: con el perfil basta para enseñar el saldo,
      // aunque el historial no haya cargado.
      const r = await Promise.allSettled([
        getMyProfile(),
        getPointEvents(),
        getChallenges(),
        getMyChallengeCompletions(),
      ])
      if (!alive) return
      const valor = <T,>(i: number, porDefecto: T): T =>
        r[i].status === 'fulfilled' ? ((r[i] as PromiseFulfilledResult<T>).value ?? porDefecto) : porDefecto

      const p = valor<Profile | null>(0, null)
      setProfile(p)
      setEvents(valor(1, []))
      setChallenges(valor(2, []))
      setCompletions(valor(3, new Set<string>()))

      // Ya se puede pintar. El miembro vinculado se carga despues porque solo
      // afecta a la tarjeta de arriba, y hacerlo esperar dejaba la pagina en
      // blanco por un dato accesorio.
      setLoad(false)

      // Este SI depende del perfil: hace falta su member_id. Va en su propio
      // try porque llega DESPUES de pintar: si falla, la pagina ya se ve.
      if (p?.member_id) {
        try {
          const m = await getMember(p.member_id)
          if (alive && m) setMiembro(m)
        } catch {
          /* la tarjeta de arriba se queda sin foto; el resto funciona */
        }
      }
    })().catch(() => {
      // Red de seguridad final: pase lo que pase, la rueda para.
      if (alive) setLoad(false)
    })
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

  const linkedMember: Member | undefined = miembro ?? undefined

  const alreadyCheckedIn = profile?.last_checkin
    ? new Date(profile.last_checkin).toDateString() === new Date().toDateString()
    : false

  const onCheckin = async () => {
    setChecking(true)
    const pts = await dailyCheckin()
    if (pts !== null) {
      setProfile(await getMyProfile())
      setEvents(await getPointEvents())
    }
    setChecking(false)
  }

{loading || load || refreshing ? (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-elite-primary" />
    </div>
  ) : (
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

        {/* Selector de modo BR - Solo/Duo/Escuadra con slide up/down */}
        <div className="relative mb-6">
          <div className="flex items-center gap-2 bg-elite-card border border-elite-border rounded-xl p-3 mb-3">
            <span className="text-xs uppercase tracking-wider text-white/40">Modo BR</span>
            {MODOS_RANKED.map((modo, mi) => (
              <button
                key={modo}
                onClick={() => setModoActual(modo)}
                className={cn(
                  'flex-1 rounded-lg p-2 text-sm font-medium transition-colors',
                  modo === modoActual
                    ? 'bg-elite-primary text-elite-dark'
                    : 'text-white/50 hover:text-white hover:bg-elite-primary/10'
                )}
              >
                {MODOS_ETIQUETAS[modo]}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/40 text-center">
            Desliza para ver detalles o toca el modo para cambiar
          </p>
        </div>

        {/* Banner estilo perfil de juego (automatico: usa la imagen que escanea el bot) */}
        <div className="relative rounded-2xl overflow-hidden border border-elite-border card-glow mb-6">
          {linkedMember?.outfit_image_url ? (
            <div className="h-28 sm:h-32 bg-cover bg-center" style={{ backgroundImage: `url(${linkedMember.outfit_image_url})` }} />
          ) : (
            <div
              className="h-28 sm:h-32"
              style={{
                background: linkedMember
                  ? `linear-gradient(90deg, ${(linkedMember.rank ? RANK_COLORS[linkedMember.rank] : null) || '#6b6156'}55, #a78bfa33, #5b9dff44)`
                  : 'linear-gradient(90deg, #5b9dff44, #a78bfa44)',
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
              className="w-24 h-24 rounded-2xl object-cover bg-black shadow-lg"
              style={{ boxShadow: linkedMember ? `0 0 0 4px ${(linkedMember.rank ? RANK_COLORS[linkedMember.rank] : null) || '#6b6156'}` : '0 0 0 4px #0d0b09', objectPosition: 'center center' }}
            />
          ) : (
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-display font-bold text-white shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #5b9dff, #a78bfa)',
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

        {/* Vinculación: Discord + Free Fire + WhatsApp, las tres juntas. */}
        <MiVinculacion
          profile={profile}
          miembro={linkedMember}
          onGuardado={async () => {
            const actualizado = await getMyProfile()
            setProfile(actualizado)
            setEvents(await getPointEvents())
            setCompletions(await getMyChallengeCompletions())
            if (actualizado?.member_id) setMiembro(await getMember(actualizado.member_id))
            runChallenges()
          }}
        />

        {/* Stats del clan */}
        {linkedMember && (
          <div className="card-glow p-6 mb-6">
            <h2 className="font-display font-bold text-xl mb-4">Tus stats del clan</h2>
            <p className="text-white/40 text-sm mb-4">
              Modo actual: <span className="font-display font-bold text-elite-primary">{MODOS_ETIQUETAS[modoActual]}</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'K/D', get: () => linkedMember.kd_ratio, invertido: false },
                { label: 'Headshots', get: () => linkedMember.headshots, invertido: false },
                { label: 'Victorias', get: () => linkedMember.wins, invertido: false },
                { label: 'Booyahs', get: () => linkedMember.booyahs, invertido: false },
              ].map((s) => {
                const valor = s.get()
                return (
                  <div key={s.label} className="bg-elite-card border border-elite-border rounded-xl p-4 text-center">
                    <p className="text-white/50 text-xs">{s.label}</p>
                    <p className="font-display font-bold text-xl gradient-text">{valor ?? '—'}</p>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-white/40 text-center mt-3">
              Desliza para ver modo {MODOS_ETIQUETAS[modoActual].toLowerCase()}
            </p>
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
