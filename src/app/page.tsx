'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Target, Trophy, Users, Zap, Flame, Crown,
  ShoppingCart, ArrowRight, MousePointer2,
  Sparkles, Shield, Sword, Star
} from 'lucide-react'

const stats = [
  { value: '50+', label: 'Miembros Activos', icon: Users, color: '#00d4ff' },
  { value: '200+', label: 'Torneos Ganados', icon: Trophy, color: '#ffd700' },
  { value: '#1', label: 'Ranking Regional', icon: Crown, color: '#c77dff' },
  { value: '99%', label: 'Win Rate Squad', icon: Flame, color: '#ff6b6b' },
]

const features = [
  {
    icon: Zap,
    title: 'Tiempo Real',
    desc: 'Stats actualizadas live desde nuestros bots. K/D, headshots, rango, todo en vivo.'
  },
  {
    icon: Shield,
    title: 'Anti-Cheat',
    desc: 'Sistema propio de detección. Solo jugadores limpios en La Elite.'
  },
  {
    icon: Sword,
    title: 'Competitivo Puro',
    desc: 'Scrims diarios, torneos semanales, ligas oficiales. Entrenamos para ganar.'
  },
  {
    icon: Star,
    title: 'PagoStore Premium',
    desc: 'Diamantes al mejor precio, entrega instantánea, soporte 24/7. Clon de Garena con nuestro estilo.'
  },
]

const leaderboard = [
  { name: 'TokioCEO', kd: '8.4' },
  { name: 'ShadowKiller', kd: '7.9' },
  { name: 'NightmareOP', kd: '7.2' },
  { name: 'GhostAim', kd: '6.8' },
  { name: 'VenomPro', kd: '6.5' },
]

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-elite-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-elite-secondary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,212,255,0.03)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
      </div>

      {/* Hero Section */}
      <section id="inicio" className="relative min-h-screen flex items-center pt-16 md:pt-20">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial={{ y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-primary/10 border border-elite-primary/30 mb-6"
                initial={{ scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <motion.div
                  className="w-2 h-2 bg-elite-primary rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-sm font-medium text-elite-primary">CLAN COMPETITIVO FREE FIRE</span>
                <motion.div
                  className="w-2 h-2 bg-elite-primary rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
                />
              </motion.div>

              <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.1] mb-6">
                <span className="block">La Elite</span>
                <span className="block gradient-text">PvP</span>
              </h1>
              <p className="text-xl sm:text-2xl text-white/70 mb-8 max-w-xl leading-relaxed">
                El clan más letal de Free Fire. Dominamos ranked, arrasamos torneos y vendemos diamantes
                al mejor precio. ¿Te atreves a entrar?
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-12">
                <Link href="/unirse" className="btn-primary group inline-flex items-center gap-2 text-lg px-8 py-4">
                  <MousePointer2 className="w-5 h-5" />
                  Unirse al Clan
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="/pagostore" className="btn-secondary group inline-flex items-center gap-2 text-lg px-8 py-4">
                  <ShoppingCart className="w-5 h-5" />
                  PagoStore Premium
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

            {/* Hero Visual */}
            <motion.div
              initial={{ x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="relative"
            >
              <div className="relative aspect-square max-w-md mx-auto">
                {/* Main Card */}
                <motion.div
                  className="card-glow absolute inset-0 p-1"
                  animate={{ rotate: [0, 1, -1, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="relative h-full bg-elite-card/90 backdrop-blur-2xl border border-elite-border rounded-2xl p-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-elite-primary to-elite-secondary flex items-center justify-center">
                          <Crown className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <p className="font-display font-bold text-xl gradient-text">La Elite PvP</p>
                          <p className="text-sm text-white/50">Clan Oficial • Verificado</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-elite-primary/10 px-3 py-1 rounded-full">
                        <motion.div className="w-2 h-2 bg-elite-primary rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-elite-primary">LIVE</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {stats.map((stat, i) => (
                        <motion.div
                          key={stat.label}
                          className="bg-elite-dark/50 border border-elite-border rounded-xl p-4"
                          initial={{ y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                        >
                          <stat.icon className="w-6 h-6 mb-2" style={{ color: stat.color }} />
                          <p className="font-display font-bold text-2xl gradient-text">{stat.value}</p>
                          <p className="text-xs text-white/60">{stat.label}</p>
                        </motion.div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {leaderboard.map((row, i) => (
                        <motion.div
                          key={row.name}
                          className="flex items-center justify-between bg-elite-dark/30 rounded-lg p-3 hover:bg-elite-primary/10 transition-colors"
                          initial={{ x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.08 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-elite-primary to-elite-secondary flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </div>
                            <span className="font-medium">{row.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/60 text-sm">
                            <Flame className="w-4 h-4" />
                            <span>{row.kd} K/D</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Floating Cards */}
                <motion.div
                  className="absolute -top-4 -right-4 w-48 card-glow p-4"
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="text-center">
                    <Trophy className="w-10 h-10 mx-auto mb-2 text-elite-gold" />
                    <p className="font-display font-bold text-xl gradient-text">TOP 1</p>
                    <p className="text-sm text-white/60">Regional League S12</p>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute bottom-4 -left-6 w-44 card-glow p-3"
                  animate={{ x: [0, 15, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-elite-gold to-yellow-500 flex items-center justify-center">
                      <Flame className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <p className="font-bold gradient-text">Fire Pass</p>
                      <p className="text-xs text-white/50">Nivel MAX • Todo desbloqueado</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="absolute top-1/2 right-1/2 w-40 card-glow p-3 -translate-y-1/2"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                >
                  <div className="text-center">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-1 text-elite-primary" />
                    <p className="font-bold text-sm gradient-text">PagoStore</p>
                    <p className="text-xs text-white/50">Diamantes Instantáneos</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <MousePointer2 className="w-6 h-6" />
            <span className="text-xs">Scroll para descubrir</span>
          </motion.div>
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
                <p className="font-display font-bold text-4xl sm:text-5xl gradient-text">{stat.value}</p>
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
              Únete a 50+ jugadores competitivos. Scrims diarios, torneos semanales, ranked push squad,
              y la mejor tienda de diamantes. Todo en un solo lugar.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/unirse" className="btn-primary group inline-flex items-center gap-2 text-lg px-10 py-4">
                <MousePointer2 className="w-5 h-5" />
                Quiero Ser Elite
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/pagostore" className="btn-secondary group inline-flex items-center gap-2 text-lg px-10 py-4">
                <ShoppingCart className="w-5 h-5" />
                Ver PagoStore
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <p className="mt-6 text-sm text-white/40">
              Sin compromiso • Prueba 7 días gratis • Soporte Discord 24/7
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
