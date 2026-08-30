'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Trophy, Users, Zap, Flame, Crown,
  MousePointer2, ArrowRight,
  Sparkles, Shield, Sword, Star, Target,
  Crosshair,
} from 'lucide-react'
import { getMembersLigero, getTournaments } from '@/lib/data'
import type { Member } from '@/lib/types'
import { demoMembers, demoTournaments } from '@/lib/demo-data'
import WeaponParallax from '@/components/home/WeaponParallax'
import HeroScene from '@/components/home/HeroScene'
import OutfitAmbiente from '@/components/home/OutfitAmbiente'

const features = [
  {
    icon: Zap,
    title: 'Tiempo Real',
    desc: 'Stats actualizadas live desde nuestros bots. K/D, headshots, rango, todo en vivo.',
  },
  {
    icon: Shield,
    title: 'Anti-Cheat',
    desc: 'Sistema propio de detección. Solo jugadores limpios en La Elite.',
  },
  {
    icon: Sword,
    title: 'Competitivo Puro',
    desc: 'Scrims diarios, torneos semanales, ligas oficiales. Entrenamos para ganar.',
  },
  {
    icon: Star,
    title: 'PagoStore Premium',
    desc: 'Diamantes al mejor precio, entrega instantánea, soporte 24/7. 5% descuento miembros.',
  },
]

export default function Home() {
  const [stats, setStats] = useState([
    { value: '—', label: 'Miembros Activos', icon: Users, color: '#5b9dff' },
    { value: '—', label: 'Torneos', icon: Trophy, color: '#f0b429' },
    { value: '—', label: 'Mejor K/D', icon: Crown, color: '#a78bfa' },
    { value: '—', label: 'Kills Totales', icon: Flame, color: '#f0b429' },
  ])
  const [todos, setTodos] = useState<Member[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [members, tournaments] = await Promise.all([
        getMembersLigero().catch(() => demoMembers),
        getTournaments().catch(() => demoTournaments),
      ])
      if (!alive) return
      const totalMembers = members.length
      const torneosGanados = tournaments.filter((t) => t.placement === 1).length
      const torneosTotales = tournaments.length
      const topKd = members.reduce((a, m) => ((m.kd_ratio || 0) > a ? (m.kd_ratio as number) : a), 0)
      const totalKills = members.reduce((a, m) => a + (m.kills ?? 0), 0)
      setStats([
        { value: String(totalMembers), label: 'Miembros Activos', icon: Users, color: '#5b9dff' },
        torneosGanados > 0
          ? { value: String(torneosGanados), label: 'Torneos Ganados', icon: Trophy, color: '#f0b429' }
          : { value: String(torneosTotales), label: 'Torneos Jugados', icon: Trophy, color: '#f0b429' },
        { value: topKd ? topKd.toFixed(1) : '0', label: 'Mejor K/D', icon: Crown, color: '#a78bfa' },
        { value: totalKills.toLocaleString('es'), label: 'Kills Totales', icon: Flame, color: '#f0b429' },
      ])
      setTodos(members)
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="min-h-screen relative overflow-x-hidden">

      {/* Hero Section */}
      <section id="inicio" className="relative min-h-screen flex items-center pt-16 md:pt-20 overflow-hidden">
        <WeaponParallax />
        <OutfitAmbiente members={todos} />
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[55%]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(91,157,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(91,157,255,0.18) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              transform: 'perspective(420px) rotateX(72deg)',
              transformOrigin: 'bottom',
              WebkitMaskImage: 'linear-gradient(to top, #000 10%, transparent 80%)',
              maskImage: 'linear-gradient(to top, #000 10%, transparent 80%)',
            }}
          />
        </div>
        <div className="section-container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial={{ y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
               <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.1] mb-6 mt-8">
                 <span className="gradient-text-shimmer">La Elite PvP</span>
               </h1>
              <p className="text-xl sm:text-2xl text-white/70 mb-8 max-w-xl leading-relaxed">
                El clan más letal de Free Fire. Dominamos ranked y arrasamos torneos.
                ¿Te atreves a entrar?
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-12">
                <Link href="/unirse" className="btn-primary group inline-flex items-center gap-2 text-lg px-8 py-4">
                  <MousePointer2 className="w-5 h-5" />
                  Unirse al Clan
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/ia" className="btn-secondary group inline-flex items-center gap-2 text-lg px-8 py-4">
                  <Crosshair className="w-5 h-5" />
                  Sensibilidad Perfecta IA
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-8 text-white/60">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-elite-primary" />
                  <span>Scrims Diarios 20:00</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-elite-secondary" />
                  <span>Ranked Push Squad</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-elite-gold" />
                  <span>Eventos Exclusivos</span>
                </div>
              </div>
            </motion.div>

            {/* Hero Visual 3D */}
            <HeroScene members={todos} />
          </div>

        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 border-y border-elite-border">
        <div className="section-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <stat.icon className="w-10 h-10 mx-auto mb-3" style={{ color: stat.color }} />
                <p className="font-display font-bold text-4xl sm:text-5xl tabular-nums">{stat.value}</p>
                <p className="text-white/60 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="section-container">
          <motion.div
            className="text-center mb-16"
            initial={{ y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="section-title">Por qué La Elite</h2>
            <p className="section-subtitle">No somos un clan más. Somos la élite competitiva.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="card-glow p-6 group"
                initial={{ y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-elite-primary/20 to-elite-secondary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-elite-primary" />
                </div>
                <h3 className="font-display font-bold text-xl mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-elite-primary/10 via-transparent to-elite-secondary/10" />
        <div className="section-container relative">
          <motion.div
            className="card-glow p-8 md:p-16 text-center max-w-4xl mx-auto"
            initial={{ scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <Sparkles className="w-8 h-8 text-elite-gold animate-spin" />
              <h2 className="font-display font-bold text-3xl sm:text-4xl gradient-text">¿Listo para ser Elite?</h2>
              <Sparkles className="w-8 h-8 text-elite-gold animate-spin" style={{ animationDirection: 'reverse' }} />
            </div>
            <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
              Únete a la comunidad, gana Elite Coin con check-in diario y retos, y desbloquea
              recompensas. Todo en un solo lugar.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/unirse" className="btn-primary group inline-flex items-center gap-2 text-lg px-10 py-4">
                <MousePointer2 className="w-5 h-5" />
                Quiero Ser Elite
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/mi" className="btn-secondary group inline-flex items-center gap-2 text-lg px-10 py-4">
                <Crown className="w-5 h-5" />
                Mi Cuenta
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
