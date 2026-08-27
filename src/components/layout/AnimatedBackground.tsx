'use client'

import { useEffect, useRef, useState } from 'react'
import { detectarGama, type Capacidades } from '@/lib/device'

/**
 * Fondo del sitio: negro con chispas carmesi subiendo.
 *
 * Antes esto rotaba 8 JPG que eran las capturas de depuracion del emulador
 * (menus del juego, la lista del clan, la pantalla de armas). Se veian como lo
 * que eran. Ahora el fondo se dibuja: no pesa nada, no se pixela, y las brasas
 * suben en vez de caer, que es lo que hace el fuego.
 *
 * El numero de chispas lo decide la gama del dispositivo; en gama baja no se
 * dibuja ninguna y queda solo el degradado, que es igual de digno.
 */
function Chispas({ cantidad }: { cantidad: number }) {
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

    type Chispa = { x: number; y: number; r: number; vy: number; deriva: number; fase: number; calor: number }
    const nueva = (alto: number): Chispa => ({
      x: Math.random() * w,
      y: alto,
      r: Math.random() * 1.8 + 0.6,
      vy: Math.random() * 0.35 + 0.12,
      deriva: (Math.random() - 0.5) * 0.25,
      fase: Math.random() * Math.PI * 2,
      // 0 = chispa apagada (carmesi hondo), 1 = viva (rosa sangre)
      calor: Math.random(),
    })
    const chispas: Chispa[] = Array.from({ length: cantidad }, () => nueva(Math.random() * h))

    const dibujar = () => {
      ctx.clearRect(0, 0, w, h)
      for (const b of chispas) {
        b.y -= b.vy
        b.fase += 0.01
        // Vaiven lateral: una chispa no sube en linea recta.
        b.x += b.deriva + Math.sin(b.fase) * 0.2

        if (b.y < -10) Object.assign(b, nueva(h + 10))
        if (b.x < -10) b.x = w + 10
        if (b.x > w + 10) b.x = -10

        // Se apagan a medida que suben.
        const vida = Math.max(0, Math.min(1, b.y / h))
        const alfa = vida * 0.55 + 0.08
        // Carmesi #e11d3c -> rosa sangre #ff4d68 segun el calor.
        const rojo = Math.round(225 + b.calor * 30)
        const verde = Math.round(29 + b.calor * 48)
        const azul = Math.round(60 + b.calor * 44)

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
      {/* Negro, con el rescoldo carmesi asomando por abajo. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 110%, rgba(225,29,60,0.16) 0%, transparent 55%),' +
            'radial-gradient(100% 70% at 50% -10%, rgba(26,20,32,0.9) 0%, transparent 60%)',
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

      {!quieto && <Chispas cantidad={cap.particulas} />}

      {/* Rejilla en perspectiva: el suelo de la arena. */}
      <div className={`absolute inset-x-0 bottom-0 h-[40vh] bg-grid ${quieto ? '' : 'animate-grid'}`} />

      {/* Viñeta para que el texto siempre tenga contraste encima. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(8,8,10,0.9)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-elite-dark/70 via-transparent to-elite-dark" />
    </div>
  )
}
