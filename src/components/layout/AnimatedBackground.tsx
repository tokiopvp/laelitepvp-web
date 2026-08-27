'use client'

import { useEffect, useRef, useState } from 'react'
import { detectarGama, type Capacidades } from '@/lib/device'

/**
 * Fondo del sitio: ceniza con brasas subiendo.
 *
 * Antes esto rotaba 8 JPG que eran las capturas de depuracion del emulador
 * (menus del juego, la lista del clan, la pantalla de armas). Se veian como lo
 * que eran. Ahora el fondo se dibuja: no pesa nada, no se pixela, y las brasas
 * suben en vez de caer, que es lo que hace el fuego.
 *
 * El numero de brasas lo decide la gama del dispositivo; en gama baja no se
 * dibuja ninguna y queda solo el degradado, que es igual de digno.
 */
function Brasas({ cantidad }: { cantidad: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || cantidad <= 0) return
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

    type Brasa = { x: number; y: number; r: number; vy: number; deriva: number; fase: number; calor: number }
    const nueva = (alto: number): Brasa => ({
      x: Math.random() * w,
      y: alto,
      r: Math.random() * 1.8 + 0.6,
      vy: Math.random() * 0.35 + 0.12,
      deriva: (Math.random() - 0.5) * 0.25,
      fase: Math.random() * Math.PI * 2,
      // 0 = ascua apagada (oro), 1 = brasa viva (naranja)
      calor: Math.random(),
    })
    const brasas: Brasa[] = Array.from({ length: cantidad }, () => nueva(Math.random() * h))

    const dibujar = () => {
      ctx.clearRect(0, 0, w, h)
      for (const b of brasas) {
        b.y -= b.vy
        b.fase += 0.01
        // Vaiven lateral: una brasa no sube en linea recta.
        b.x += b.deriva + Math.sin(b.fase) * 0.2

        if (b.y < -10) Object.assign(b, nueva(h + 10))
        if (b.x < -10) b.x = w + 10
        if (b.x > w + 10) b.x = -10

        // Se apagan a medida que suben.
        const vida = Math.max(0, Math.min(1, b.y / h))
        const alfa = vida * 0.55 + 0.08
        const rojo = 255
        const verde = Math.round(90 + b.calor * 100)
        const azul = Math.round(20 + b.calor * 40)

        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rojo}, ${verde}, ${azul}, ${alfa})`
        ctx.fill()
      }
      raf = requestAnimationFrame(dibujar)
    }
    dibujar()

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [cantidad])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />
}

export default function AnimatedBackground() {
  // Arranca en la gama mas baja y sube si el dispositivo da: asi el primer
  // pintado nunca promete un efecto que despues haya que retirar.
  const [cap, setCap] = useState<Capacidades>({
    gama: 'bajo', particulas: 0, webgl: false, quieto: false,
  })
  useEffect(() => setCap(detectarGama()), [])

  const quieto = cap.quieto

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-elite-dark" aria-hidden>
      {/* Ceniza: el ground, con la brasa asomando por abajo como un rescoldo. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 110%, rgba(255,90,31,0.16) 0%, transparent 55%),' +
            'radial-gradient(100% 70% at 50% -10%, rgba(34,26,20,0.9) 0%, transparent 60%)',
        }}
      />

      {/* Halos de calor. Se mueven muy lento; en modo ahorro quedan quietos. */}
      <div className="absolute inset-0 bg-aurora" />
      <div
        className={`absolute -left-1/4 top-0 h-[60vh] w-[60vh] rounded-full bg-elite-primary/15 blur-[130px] ${
          quieto ? '' : 'animate-aurora-a'
        }`}
      />
      <div
        className={`absolute right-0 top-1/3 h-[55vh] w-[55vh] rounded-full bg-elite-secondary/12 blur-[130px] ${
          quieto ? '' : 'animate-aurora-b'
        }`}
      />
      <div
        className={`absolute bottom-0 left-1/3 h-[50vh] w-[50vh] rounded-full bg-elite-gold/8 blur-[130px] ${
          quieto ? '' : 'animate-aurora-c'
        }`}
      />

      {!quieto && <Brasas cantidad={cap.particulas} />}

      {/* Rejilla en perspectiva: el suelo de la arena. */}
      <div className={`absolute inset-x-0 bottom-0 h-[40vh] bg-grid ${quieto ? '' : 'animate-grid'}`} />

      {/* Viñeta para que el texto siempre tenga contraste encima. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(13,11,9,0.88)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-elite-dark/70 via-transparent to-elite-dark" />
    </div>
  )
}
