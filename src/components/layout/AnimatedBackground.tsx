'use client'

import { useEffect, useRef, useState } from 'react'

const IMAGES = [
  '/media/backgrounds/g_armas.jpg',
  '/media/backgrounds/det_clan.jpg',
  '/media/backgrounds/mosaico.jpg',
  '/media/backgrounds/sel_top.jpg',
  '/media/backgrounds/pantalla_actual.jpg',
  '/media/backgrounds/g_lista.jpg',
  '/media/backgrounds/captura_arranque.jpg',
  '/media/backgrounds/g_menu.jpg',
]

function Particles() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    type P = { x: number; y: number; s: number; v: number; a: number }
    const parts: P[] = Array.from({ length: reduce ? 18 : 46 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      s: Math.random() * 2 + 0.6,
      v: Math.random() * 0.4 + 0.12,
      a: Math.random() * 0.5 + 0.2,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        p.y -= p.v
        if (p.y < -4) {
          p.y = h + 4
          p.x = Math.random() * w
        }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 4)
        g.addColorStop(0, `rgba(0,212,255,${p.a})`)
        g.addColorStop(1, 'rgba(0,212,255,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.s * 4, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />
}

export default function AnimatedBackground() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % IMAGES.length), 6000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-elite-dark" aria-hidden>
      {/* Capa de imagenes (Ken Burns + crossfade) */}
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out ${
            i === idx ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${src})`,
            filter: 'blur(3px) brightness(0.45) saturate(1.25)',
            transform: i === idx ? 'scale(1.12)' : 'scale(1.0)',
            transitionProperty: 'opacity, transform',
            transitionDuration: '3000ms, 7000ms',
          }}
        />
      ))}

      {/* Aurora animada de color */}
      <div className="absolute inset-0 bg-aurora" />
      <div className="absolute -left-1/4 top-0 h-[60vh] w-[60vh] rounded-full bg-elite-primary/20 blur-[120px] animate-aurora-a" />
      <div className="absolute right-0 top-1/3 h-[55vh] w-[55vh] rounded-full bg-elite-secondary/20 blur-[120px] animate-aurora-b" />
      <div className="absolute bottom-0 left-1/3 h-[50vh] w-[50vh] rounded-full bg-elite-gold/10 blur-[120px] animate-aurora-c" />

      {/* Particulas */}
      <Particles />

      {/* Grid neón en perspectiva */}
      <div className="absolute inset-x-0 bottom-0 h-[40vh] bg-grid animate-grid" />

      {/* Viñeta para legibilidad */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(10,10,15,0.85)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-elite-dark/70 via-transparent to-elite-dark" />
    </div>
  )
}
