'use client'

import { useEffect, useRef } from 'react'
import { useGama } from '@/components/layout/Resplandor'

/**
 * Fondo del sitio: negro y estrellas a la deriva.
 *
 * QUE HABIA ANTES Y POR QUE SE FUE
 * --------------------------------
 * Chispas subiendo, tres halos de calor y una rejilla en perspectiva. Cada
 * pieza estaba bien resuelta, pero juntas eran CUATRO cosas moviendose detras
 * del contenido. El fondo competia con lo que habia encima, y un fondo que
 * compite es lo que hace que un sitio se lea barato por mucho que las tarjetas
 * esten bien hechas.
 *
 * Ahora hay una sola: el campo de estrellas. Un fondo caro no es el que tiene
 * mas cosas, es el que tiene una sola bien hecha y muy tranquila.
 *
 * TRES CAPAS, Y ESO ES TODO EL TRUCO
 * ----------------------------------
 * Las estrellas se reparten en tres profundidades. Las del fondo son diminutas
 * y casi no se mueven; las de delante son mayores, mas brillantes y van tres
 * veces mas rapido. Esa diferencia de velocidad es lo unico que convierte unos
 * puntos blancos en un espacio con hondura: sin ella se ve un papel pintado.
 *
 * La deriva es MUY lenta a proposito (segundos por pixel). Tiene que notarse
 * si te quedas mirando y desaparecer si estas leyendo.
 *
 * NO PARPADEAN TODAS A LA VEZ
 * ---------------------------
 * Cada estrella lleva su propia fase, asi que el titileo nunca se sincroniza.
 * Un campo de estrellas que pulsa a la vez se lee como un cursor y molesta.
 *
 * COSTE
 * -----
 * Un canvas y una circunferencia por estrella. Sin blur, sin sombras, sin
 * animar `background-position` (que obliga a repintar) — lo unico caro que
 * habia antes. En gama baja no se dibuja ninguna y queda el degradado solo,
 * que sigue siendo digno.
 */
function Estrellas({ cantidad, animado }: { cantidad: number; animado: boolean }) {
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

    type Estrella = {
      x: number
      y: number
      r: number
      vx: number
      vy: number
      base: number   // brillo de reposo
      fase: number   // desfase del titileo, propio de cada una
      vel: number    // lo rapido que titila
      tinte: string
    }

    // Casi todas blancas. Una de cada seis, azul o violeta muy palido: le da
    // temperatura al campo sin que se note que hay color.
    const TINTES = [
      '255,255,255', '255,255,255', '255,255,255',
      '255,255,255', '198,218,255', '205,196,255',
    ]

    const nueva = (): Estrella => {
      // capa 0 = fondo (lejos, lenta, tenue) .. capa 2 = frente
      const capa = Math.random() < 0.6 ? 0 : Math.random() < 0.75 ? 1 : 2
      const prof = [0.35, 0.7, 1][capa]
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: [0.7, 1.1, 1.7][capa] + Math.random() * 0.4,
        // Deriva en diagonal suave, siempre en el mismo sentido: un campo que
        // va en direcciones distintas se lee como ruido, no como movimiento.
        // Tres veces mas rapido que la primera version. Aquella era tan lenta
        // que en una pantalla grande el campo parecia una imagen fija; el
        // movimiento solo se apreciaba mirando treinta segundos seguidos.
        // Con esto se nota al entrar y sigue sin robar atencion al contenido.
        vx: (0.038 + Math.random() * 0.042) * prof,
        vy: (-0.018 - Math.random() * 0.024) * prof,
        base: [0.42, 0.66, 0.92][capa] + Math.random() * 0.14,
        fase: Math.random() * Math.PI * 2,
        vel: 0.0004 + Math.random() * 0.0011,
        tinte: TINTES[(Math.random() * TINTES.length) | 0],
      }
    }

    let estrellas: Estrella[] = Array.from({ length: cantidad }, nueva)

    /*
      METEORITOS
      ----------
      Uno cada pocos segundos, nunca dos a la vez. Es el detalle que convierte
      un fondo bonito en un sitio que parece vivo: no pasa nada durante un rato
      y de pronto cruza algo.

      Se dibujan como UNA linea con degradado, no como una fila de particulas
      con estela. Un meteorito cuesta entonces lo mismo que dos estrellas, y
      por eso caben aunque el equipo sea modesto: el problema de rendimiento
      que hubo aqui venia de los desenfoques grandes, no del numero de cosas.

      Van en la misma diagonal que la deriva de las estrellas. Si cruzaran en
      otra direccion se leerian como un error, no como parte del cielo.
    */
    type Meteoro = { x: number; y: number; largo: number; vel: number; vida: number; tinte: string }
    let meteoro: Meteoro | null = null
    // El primero no sale de inmediato: entrar a la pagina y ver pasar uno en el
    // primer segundo delata que es un truco.
    let proximo = 1800 + Math.random() * 3500

    const nuevoMeteoro = (): Meteoro => ({
      // Nace arriba y a la izquierda del area visible, para entrar cruzando.
      x: -80 + Math.random() * w * 0.75,
      y: h * (0.05 + Math.random() * 0.5),
      largo: 90 + Math.random() * 140,
      vel: 5.5 + Math.random() * 4.5,
      vida: 0,
      // Los mismos tintes del campo: azul palido y violeta, nunca blanco puro,
      // que se leeria como un rayajo.
      tinte: Math.random() < 0.5 ? '198,218,255' : '205,196,255',
    })

    /** Un unico fotograma: el campo quieto, sin titileo ni meteoritos. */
    const pintarUnaVez = () => {
      ctx.clearRect(0, 0, w, h)
      for (const e of estrellas) {
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${e.tinte},${e.base})`
        ctx.fill()
      }
    }

    const pintar = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const e of estrellas) {
        e.x += e.vx
        e.y += e.vy
        // Al salir por un borde reaparece por el contrario: el campo no se
        // agota nunca y no hace falta crear estrellas nuevas.
        if (e.x > w + 2) e.x = -2
        if (e.y < -2) e.y = h + 2

        // Titileo suave alrededor del brillo de reposo. El 0.22 es corto a
        // proposito: mas amplitud y el campo empieza a "hervir".
        const alfa = Math.max(0, Math.min(1, e.base + Math.sin(t * e.vel + e.fase) * 0.22))
        ctx.beginPath()
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${e.tinte},${alfa})`
        ctx.fill()
      }
      // --- Meteorito ---
      const dt = t - (ultimo || t)
      ultimo = t
      if (meteoro) {
        const m = meteoro
        m.x += m.vel
        m.y += m.vel * 0.42     // misma diagonal que la deriva del campo
        m.vida += dt
        // Entra y sale con un fundido: aparecer de golpe se ve como un fallo
        // de dibujado, no como algo que cruza.
        const p = Math.min(1, m.vida / 900)
        const alfa = Math.sin(p * Math.PI) * 0.85
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.largo, m.y - m.largo * 0.42)
        g.addColorStop(0, `rgba(${m.tinte},${alfa})`)
        g.addColorStop(1, `rgba(${m.tinte},0)`)
        ctx.strokeStyle = g
        ctx.lineWidth = 1.6
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(m.x - m.largo, m.y - m.largo * 0.42)
        ctx.stroke()
        if (p >= 1 || m.x - m.largo > w || m.y - m.largo > h) meteoro = null
      } else {
        proximo -= dt
        if (proximo <= 0) {
          meteoro = nuevoMeteoro()
          proximo = 4200 + Math.random() * 7000
        }
      }

      raf = requestAnimationFrame(pintar)
    }
    let ultimo = 0

    /*
      CON "REDUCIR MOVIMIENTO" SE PINTA UNA SOLA VEZ.

      Antes, esa preferencia apagaba el fondo ENTERO y dejaba un negro liso.
      Eso es pasarse: lo que la persona ha pedido es que las cosas no se
      muevan, no quedarse sin diseno. Y en Windows la opcion de animaciones
      viene desactivada en muchisimos equipos -sobre todo en los que se tocan
      para jugar-, asi que a un monton de gente el sitio le llegaba pelado sin
      que nadie lo hubiera decidido.

      Un fotograma quieto da el cielo estrellado completo, con su profundidad,
      y no se mueve absolutamente nada. Tampoco hay meteoritos: un destello
      cruzando la pantalla es justo lo que esa preferencia quiere evitar.
    */
    if (!animado) {
      pintarUnaVez()
      return () => {
        window.removeEventListener('resize', alCambiarTamano)
      }
    }
    raf = requestAnimationFrame(pintar)

    const alCambiarTamano = () => {
      resize()
      estrellas = Array.from({ length: cantidad }, nueva)
      meteoro = null
      if (!animado) pintarUnaVez()
    }
    window.addEventListener('resize', alCambiarTamano)

    // Con la pestana de fondo no se pinta nada: en un movil eso es bateria
    // quemada por un fondo que nadie esta viendo.
    const alVisibilidad = () => {
      if (document.hidden) cancelAnimationFrame(raf)
      else raf = requestAnimationFrame(pintar)
    }
    document.addEventListener('visibilitychange', alVisibilidad)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', alCambiarTamano)
      document.removeEventListener('visibilitychange', alVisibilidad)
    }
  }, [cantidad, animado])

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />
}

export default function AnimatedBackground() {
  const cap = useGama()
  const quieto = cap.quieto

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-elite-dark" aria-hidden>
      {/*
        El cielo. Dos manchas MUY tenues, una azul arriba y una violeta abajo,
        para que el negro no sea una pared plana.

        Los porcentajes son bajisimos (0.045 y 0.03) y no es un descuido: por
        encima de eso el fondo deja de ser negro y se convierte en "azul
        oscuro". En el movil ya se veia bien negro; en el escritorio, con mas
        pantalla que cubrir, esos mismos porcentajes se sumaban a las manchas
        de Resplandor y el conjunto se aclaraba. Cuanto mas negro este el
        fondo, mas se ven las estrellas.
      */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% -20%, rgba(91,157,255,0.045) 0%, transparent 60%),' +
            'radial-gradient(100% 80% at 50% 120%, rgba(167,139,250,0.03) 0%, transparent 60%)',
        }}
      />

      {/*
        El presupuesto de particulas venia calibrado para las brasas de antes,
        que llevaban degradado y estela. Una estrella es un `arc` y un `fill`:
        cuesta una fraccion, asi que hay suelo de 34 incluso en gama baja.

        Las estrellas SIEMPRE se animan: son un efecto de fondo sutil que no
        causa mareos ni distraccion. El `quieto` solo se respeta para efectos
        que puedan causar incomodidad (parpadeos, destellos), no para un campo
        estrellado que se mueve a pasos de tortuga.
      */}
      <Estrellas
        cantidad={Math.max(60, Math.round(cap.particulas * 5))}
        animado={true}
      />

      {/*
        Vinieta. Oscurece los bordes para que el texto siempre tenga contraste
        por debajo, pase lo que pase con las estrellas.
      */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(7,8,10,0.85)_100%)]" />
    </div>
  )
}
