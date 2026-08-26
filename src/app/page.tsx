'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { 
  Target, Trophy, Users, Zap, Flame, Crown, 
  ShoppingCart, ArrowRight, MousePointer2,
  Sparkles, Shield, Sword, Star 
} from 'lucide-react'

const navItems = [
  { href: '#inicio', label: 'Inicio', icon: Target },
  { href: '#miembros', label: 'Miembros', icon: Users },
  { href: '#tops', label: 'Tops & Rankings', icon: Trophy },
  { href: '#torneos', label: 'Torneos', icon: Crown },
  { href: '#pagostore', label: 'PagoStore Premium', icon: ShoppingCart },
]

const stats = [
  { value: '50+', label: 'Miembros Activos', icon: Users, color: 'from-elite-primary to-elite-secondary' },
  { value: '200+', label: 'Torneos Ganados', icon: Trophy, color: 'from-elite-gold to-yellow-500' },
  { value: '#1', label: 'Ranking Regional', icon: Crown, color: 'from-purple-500 to-pink-500' },
  { value: '99%', label: 'Win Rate Squad', icon: Flame, color: 'from-red-500 to-orange-500' },
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

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-elite-dark/80 backdrop-blur-2xl border-b border-elite-border">
        <div className="section-container">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link href="/" className="flex items-center gap-3" aria-label="La Elite PvP Home">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-elite-primary to-elite-secondary flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-elite-gold rounded-full"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <span className="font-display font-bold text-xl gradient-text hidden sm:block">
                La Elite PvP
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item, i) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 text-elite-primary/80 hover:text-elite-primary font-medium transition-colors relative group"
                    style={{ transitionDelay: `${i * 50}ms` }}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    <motion.div
                      className="absolute bottom-[-8px] left-0 right-0 h-0.5 bg-gradient-to-r from-elite-primary to-elite-secondary"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    />
                  </Link>
                )
              })}
            </div>

            <div className="flex items-center gap-3">
              <Link href="#unirse" className="btn-primary hidden sm:inline-flex items-center gap-2">
                <MousePointer2 className="w-4 h-4" />
                Unirse
              </Link>
              <button className="md:hidden p-2 rounded-lg hover:bg-elite-card transition-colors" aria-label="Menu">
                <MousePointer2 className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="relative min-h-screen flex items-center pt-16 md:pt-20">
        <div className="section-container">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-primary/10 border border-elite-primary/30 mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
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
                <Link href="#unirse" className="btn-primary group inline-flex items-center gap-2 text-lg px-8 py-4">
                  <MousePointer2 className="w-5 h-5" />
                  Unirse al Clan
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link href="#pagostore" className="btn-secondary group inline-flex items-center gap-2 text-lg px-8 py-4">
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
              initial={{ opacity: 0, x: 40 }}
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
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                        >
                          <stat.icon className="w-6 h-6 mb-2" style={{ color: `var(--tw-gradient-from-${stat.color.replace('from-', '').replace('to-', '')})` }} />
                          <p className="font-display font-bold text-2xl gradient-text">{stat.value}</p>
                          <p className="text-xs text-white/60">{stat.label}</p>
                        </motion.div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {['TokioCEO', 'ShadowKiller', 'NightmareOP', 'GhostAim', 'VenomPro'].map((name, i) => (
                        <motion.div
                          key={name}
                          className="flex items-center justify-between bg-elite-dark/30 rounded-lg p-3 hover:bg-elite-primary/10 transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.08 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-elite-primary to-elite-secondary flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </div>
                            <span className="font-medium">{name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/60 text-sm">
                            <Flame className="w-4 h-4" />
                            <span>{Math.floor(Math.random() * 15 + 5)}.{Math.floor(Math.random() * 9)} K/D</span>
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
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <stat.icon className="w-10 h-10 mx-auto mb-3" style={{ color: `var(--tw-gradient-from-${stat.color.replace('from-', '').replace('to-', '')})` }} />
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
            initial={{ opacity: 0, y: 20 }}
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
                initial={{ opacity: 0, y: 30 }}
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
            initial={{ opacity: 0, scale: 0.95 }}
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
              <Link href="#unirse" className="btn-primary group inline-flex items-center gap-2 text-lg px-10 py-4">
                <MousePointer2 className="w-5 h-5" />
                Quiero Ser Elite
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="#pagostore" className="btn-secondary group inline-flex items-center gap-2 text-lg px-10 py-4">
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

      {/* Footer */}
      <footer className="border-t border-elite-border py-12 bg-elite-dark/50">
        <div className="section-container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-elite-primary to-elite-secondary flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <span className="font-display font-bold text-xl gradient-text">La Elite PvP</span>
              </Link>
              <p className="text-white/60 max-w-sm">
                Clan competitivo de Free Fire. Dominamos el meta, ganamos torneos y cuidamos a los nuestros.
                Fundado 2024 • TokioCEO
              </p>
              <div className="flex gap-4 mt-6">
                <a href="https://discord.gg" target="_blank" rel="noopener" className="w-10 h-10 rounded-xl bg-elite-card border border-elite-border flex items-center justify-center hover:border-elite-primary/50 hover:bg-elite-primary/10 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.675 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.083.083 0 0 0 .031.057 19.9 19.9 0 0 0 5.992 4.065.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-.214.076.076 0 0 0 .041-.093 13.107 13.107 0 0 0-.844-1.785.077.077 0 0 1-.007-.128 10.2 10.2 0 0 1 .587-.947.077.077 0 0 1 .128-.007c2.123.64 4.35.963 6.638.963s4.515-.323 6.638-.963a.077.077 0 0 1 .128.007c.167.134.337.262.507.382a.077.077 0 0 1-.006.127 13.079 13.079 0 0 0-.844 1.785.076.076 0 0 0 .041.093 14.032 14.032 0 0 0 1.226.214.077.077 0 0 0 .084.028 19.839 19.839 0 0 0 5.992-4.065.081.081 0 0 0 .031-.057c.418-4.481-.426-9.017-3.556-13.66a.061.061 0 0 0-.031-.027zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener" className="w-10 h-10 rounded-xl bg-elite-card border border-elite-border flex items-center justify-center hover:border-red-500/50 hover:bg-red-500/10 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.167 3.167 0 0 0-2.112-2.235C20.237 3.596 12 3.596 12 3.596s-8.246 0-9.396.365a3.169 3.169 0 0 0-2.122 2.235C.34 7.534 0 9.452 0 12s.34 4.477.878 5.814a3.167 3.167 0 0 0 2.112 2.225c1.15.365 9.396.365 9.396.365s8.236 0 9.386-.365a3.155 3.155 0 0 0 2.112-2.225c.538-1.347.878-3.265.878-5.814s-.34-4.477-.878-5.823zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noopener" className="w-10 h-10 rounded-xl bg-elite-card border border-elite-border flex items-center justify-center hover:border-pink-500/50 hover:bg-pink-500/10 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.545,10.239v3.821h5.445l-0.712,4.544H12.545v11.435h4.874V10.239H12.545z"/></svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener" className="w-10 h-10 rounded-xl bg-elite-card border border-elite-border flex items-center justify-center hover:border-purple-500/50 hover:bg-purple-500/10 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-.128-.058-1.69-.072-4.949-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-display font-bold text-lg mb-4">Enlaces Rápidos</h4>
              <ul className="space-y-2 text-white/60">
                {['#inicio', '#miembros', '#tops', '#torneos', '#pagostore', '#unirse'].map(href => (
                  <li key={href}>
                    <a href={href} className="hover:text-elite-primary transition-colors text-sm">{href.replace('#', '').charAt(0).toUpperCase() + href.slice(1)}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold text-lg mb-4">Contacto</h4>
              <ul className="space-y-2 text-white/60 text-sm">
                <li>Discord: discord.gg/laelitepvp</li>
                <li>Email: contacto@laelitepvp.com</li>
                <li>WhatsApp: +52 1 55 1234 5678</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-elite-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">
              © 2025 La Elite PvP. Todos los derechos reservados. No afiliado a Garena Free Fire.
            </p>
            <div className="flex items-center gap-4 text-white/40 text-sm">
              <a href="/privacidad" className="hover:text-elite-primary transition-colors">Privacidad</a>
              <a href="/terminos" className="hover:text-elite-primary transition-colors">Términos</a>
              <a href="/cookies" className="hover:text-elite-primary transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}