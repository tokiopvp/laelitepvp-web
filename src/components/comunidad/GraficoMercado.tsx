'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getVelas, getOperaciones, precioTexto, coinsCorto } from '@/lib/economia'
import { subscribeToTable } from '@/lib/data'
import type { Vela, Operacion } from '@/lib/economia'

/**
 * El mercado de Elite Coin, dibujado como un gráfico de velas.
 *
 * QUÉ ES Y QUÉ NO ES
 * ------------------
 * Es el reflejo visual de la economía del clan: cada Elite Coin que alguien
 * gana empuja la vela hacia arriba, cada canje la empuja hacia abajo, y la
 * cuenta de la casa vende de vez en cuando para que la línea oscile en lugar de
 * dibujar una rampa. NO es un activo: no se compra, no se vende y no vale
 * dinero. Está aquí porque ver tu propia vela verde aparecer al terminar una
 * tarea es lo que hace que quieras la siguiente.
 *
 * POR QUÉ CANVAS Y NO UNA LIBRERÍA
 * --------------------------------
 * Una librería de gráficos financieros ronda los 200 KB. Este componente pesa
 * unos pocos KB y el público del sitio entra desde teléfonos de gama baja con
 * datos móviles: ahí, 200 KB es la diferencia entre ver el gráfico y cerrar la
 * pestaña. Canvas además dibuja 180 velas en un solo repintado, mientras que
 * 180 nodos SVG hacen sudar al navegador en cada `hover`.
 */

const VERDE = '#2ebd85'
const ROJO = '#e5484d'
const REJILLA = 'rgba(255,255,255,0.05)'
const TEXTO = 'rgba(255,255,255,0.35)'

type Rango = { label: string; velas: number }

// El eje temporal depende de cuántas velas se pidan: con velas de 5 minutos,
// 72 son 6 horas y 288 un día.
const RANGOS: Rango[] = [
  { label: '1H', velas: 12 },
  { label: '6H', velas: 72 },
  { label: '1D', velas: 288 },
  { label: 'MAX', velas: 600 },
]

export default function GraficoMercado() {
  const [velas, setVelas] = useState<Vela[]>([])
  const [ops, setOps] = useState<Operacion[]>([])
  const [rango, setRango] = useState(1)
  const [cargando, setCargando] = useState(true)
  const [cursor, setCursor] = useState<{ i: number; x: number; y: number } | null>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const caja = useRef<HTMLDivElement>(null)

  const cargar = useCallback(async () => {
    const [v, o] = await Promise.all([getVelas(600), getOperaciones(24)])
    setVelas(v)
    setOps(o)
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()

    // Cuando alguien cobra una tarea, su vela tiene que aparecer AHORA. Ese
    // instante —ver tu propia vela verde salir— es el gancho entero del
    // gráfico; con un minuto de retraso ya nadie lo relaciona con lo que hizo.
    const offOperaciones = subscribeToTable('market_trades', cargar)

    // Red de seguridad: el intervalo cierra las velas cuando NO hay actividad
    // (ahí no llega ningún evento) y cubre una conexión de realtime caída.
    const t = setInterval(cargar, 60_000)

    // Al volver a la pestaña se refresca ya: nadie quiere mirar un precio de
    // hace media hora.
    const alVolver = () => document.visibilityState === 'visible' && cargar()
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      offOperaciones()
      clearInterval(t)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [cargar])

  const visibles = useMemo(
    () => velas.slice(Math.max(0, velas.length - RANGOS[rango].velas)),
    [velas, rango]
  )

  const ultima = visibles[visibles.length - 1]
  const primera = visibles[0]
  const variacion =
    primera && ultima && primera.open > 0
      ? ((ultima.close - primera.open) / primera.open) * 100
      : 0
  const sube = variacion >= 0

  // ----------------------------------------------------------
  // Dibujo
  // ----------------------------------------------------------
  useEffect(() => {
    const cv = lienzo.current
    const cont = caja.current
    if (!cv || !cont || visibles.length === 0) return

    // El canvas se dibuja a la resolución real del dispositivo. Sin esto, en
    // una pantalla de móvil el gráfico entero se ve borroso.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = cont.clientWidth
    const h = cont.clientHeight
    cv.width = w * dpr
    cv.height = h * dpr
    cv.style.width = w + 'px'
    cv.style.height = h + 'px'
    const c = cv.getContext('2d')
    if (!c) return
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    c.clearRect(0, 0, w, h)

    const padD = 62 // sitio para la escala de precios, a la derecha
    const padB = 22 // sitio para las horas
    const altoVol = Math.round(h * 0.16)
    const gw = w - padD
    const gh = h - padB - altoVol - 6

    let max = -Infinity
    let min = Infinity
    let maxVol = 0
    for (const v of visibles) {
      if (v.high > max) max = v.high
      if (v.low < min) min = v.low
      if (v.volumen > maxVol) maxVol = v.volumen
    }
    // Un respiro arriba y abajo: pegar la vela al borde hace que parezca que el
    // gráfico está cortado.
    const margen = (max - min) * 0.12 || max * 0.05 || 1
    max += margen
    min -= margen
    const rangoP = max - min || 1

    const aY = (p: number) => gh - ((p - min) / rangoP) * gh
    const ancho = gw / visibles.length
    const cuerpo = Math.max(1, Math.min(ancho * 0.66, 14))

    // --- Rejilla y escala de precios ---
    c.font = '10px ui-monospace, monospace'
    c.textBaseline = 'middle'
    for (let i = 0; i <= 4; i++) {
      const y = (gh / 4) * i
      const p = max - (rangoP / 4) * i
      c.strokeStyle = REJILLA
      c.lineWidth = 1
      c.beginPath()
      // El .5 alinea la línea al píxel: sin él, una línea de 1px sale gris y
      // difuminada en vez de nítida.
      c.moveTo(0, Math.round(y) + 0.5)
      c.lineTo(gw, Math.round(y) + 0.5)
      c.stroke()
      c.fillStyle = TEXTO
      c.textAlign = 'left'
      c.fillText(p.toFixed(6), gw + 8, y)
    }

    // --- Velas ---
    visibles.forEach((v, i) => {
      const x = i * ancho + ancho / 2
      const alcista = v.close >= v.open
      const col = alcista ? VERDE : ROJO
      c.strokeStyle = col
      c.fillStyle = col

      // Mecha
      c.lineWidth = 1
      c.beginPath()
      c.moveTo(Math.round(x) + 0.5, aY(v.high))
      c.lineTo(Math.round(x) + 0.5, aY(v.low))
      c.stroke()

      // Cuerpo. El mínimo de 1px es lo que hace visible una vela plana (doji):
      // sin él desaparece y el gráfico parece tener huecos.
      const yA = aY(Math.max(v.open, v.close))
      const alto = Math.max(1, Math.abs(aY(v.open) - aY(v.close)))
      c.fillRect(x - cuerpo / 2, yA, cuerpo, alto)

      // Volumen abajo, en el mismo color: se lee de un vistazo si el empujón
      // vino de gente ganando coins o de una venta.
      if (maxVol > 0 && v.volumen > 0) {
        const hv = (v.volumen / maxVol) * altoVol
        c.globalAlpha = 0.32
        c.fillRect(x - cuerpo / 2, h - padB - hv, cuerpo, hv)
        c.globalAlpha = 1
      }
    })

    // --- Línea del precio actual ---
    const yUlt = aY(visibles[visibles.length - 1].close)
    c.strokeStyle = sube ? VERDE : ROJO
    c.setLineDash([3, 3])
    c.lineWidth = 1
    c.beginPath()
    c.moveTo(0, Math.round(yUlt) + 0.5)
    c.lineTo(gw, Math.round(yUlt) + 0.5)
    c.stroke()
    c.setLineDash([])

    // Etiqueta del precio, con fondo sólido para que siempre se lea aunque
    // caiga encima de una línea de la rejilla.
    c.fillStyle = sube ? VERDE : ROJO
    c.fillRect(gw + 2, yUlt - 8, padD - 4, 16)
    c.fillStyle = '#08080a'
    c.font = 'bold 10px ui-monospace, monospace'
    c.textAlign = 'left'
    c.fillText(visibles[visibles.length - 1].close.toFixed(6), gw + 6, yUlt)

    // --- Horas ---
    c.fillStyle = TEXTO
    c.font = '10px ui-monospace, monospace'
    c.textAlign = 'center'
    const salto = Math.max(1, Math.floor(visibles.length / 6))
    visibles.forEach((v, i) => {
      if (i % salto !== 0) return
      const d = new Date(v.bucket)
      c.fillText(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        i * ancho + ancho / 2,
        h - padB / 2 + 2
      )
    })

    // --- Cruz del cursor ---
    if (cursor && cursor.i >= 0 && cursor.i < visibles.length) {
      const x = cursor.i * ancho + ancho / 2
      c.strokeStyle = 'rgba(255,255,255,0.25)'
      c.setLineDash([2, 3])
      c.beginPath()
      c.moveTo(Math.round(x) + 0.5, 0)
      c.lineTo(Math.round(x) + 0.5, h - padB)
      c.stroke()
      c.setLineDash([])
    }
  }, [visibles, cursor, sube])

  // Redibujar al cambiar de tamaño (girar el teléfono rompe el gráfico si no).
  useEffect(() => {
    const cont = caja.current
    if (!cont) return
    const ro = new ResizeObserver(() => setVelas((v) => [...v]))
    ro.observe(cont)
    return () => ro.disconnect()
  }, [])

  const alMover = (e: React.PointerEvent) => {
    const cont = caja.current
    if (!cont || visibles.length === 0) return
    const r = cont.getBoundingClientRect()
    const x = e.clientX - r.left
    const ancho = (r.width - 62) / visibles.length
    setCursor({ i: Math.floor(x / ancho), x, y: e.clientY - r.top })
  }

  const detalle = cursor && visibles[cursor.i] ? visibles[cursor.i] : null

  return (
    <section className="card-glow overflow-hidden">
      {/* Cabecera: precio y variación, el resumen de un vistazo */}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4 sm:p-5 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-lg tracking-wide">ELITE / USD</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-elite-live/10 border border-elite-live/30 text-elite-live font-mono">
              EN VIVO
            </span>
          </div>
          <p className="text-white/40 text-xs mt-0.5">Mercado interno del clan · valor simbólico</p>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="font-mono font-bold text-2xl sm:text-3xl tabular-nums">
            {ultima ? precioTexto(ultima.close) : '—'}
          </span>
          <span
            className="font-mono text-sm font-semibold"
            style={{ color: sube ? VERDE : ROJO }}
          >
            {sube ? '▲' : '▼'} {Math.abs(variacion).toFixed(2)}%
          </span>
        </div>

        <div className="ml-auto flex gap-1">
          {RANGOS.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRango(i)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                i === rango
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {/* Gráfico */}
      <div
        ref={caja}
        className="relative h-[280px] sm:h-[360px] w-full touch-pan-y"
        onPointerMove={alMover}
        onPointerLeave={() => setCursor(null)}
      >
        <canvas ref={lienzo} className="absolute inset-0" />

        {cargando && (
          <div className="absolute inset-0 grid place-items-center text-white/30 text-sm">
            Cargando mercado…
          </div>
        )}
        {!cargando && visibles.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-white/30 text-sm px-6 text-center">
            El mercado todavía no ha abierto. Completa una tarea y aparecerá tu primera vela.
          </div>
        )}

        {/* Detalle de la vela bajo el cursor */}
        {detalle && (
          <div
            className="pointer-events-none absolute top-3 left-3 rounded-lg border border-white/10 bg-black/80 backdrop-blur px-3 py-2 font-mono text-[11px] leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <div className="text-white/40">
              {new Date(detalle.bucket).toLocaleString('es', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div>
              A <span className="text-white">{detalle.open.toFixed(6)}</span>{' '}
              M <span className="text-white">{detalle.high.toFixed(6)}</span>{' '}
              m <span className="text-white">{detalle.low.toFixed(6)}</span>{' '}
              C{' '}
              <span style={{ color: detalle.close >= detalle.open ? VERDE : ROJO }}>
                {detalle.close.toFixed(6)}
              </span>
            </div>
            <div className="text-white/40">Vol {coinsCorto(detalle.volumen)} coins</div>
          </div>
        )}
      </div>

      {/* Cinta de operaciones: quién movió el mercado y con qué */}
      {ops.length > 0 && (
        <div className="border-t border-white/[0.06] px-4 sm:px-5 py-3">
          <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2 font-display">
            Últimas operaciones
          </p>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {ops.map((o) => (
              <li key={o.id} className="flex items-center gap-2 text-xs font-mono">
                <span
                  className="w-1 rounded-full shrink-0"
                  // La altura de la marca es el "tamaño de vela" 1–10: se ve de
                  // golpe si el movimiento fue un check-in o una tarea gorda.
                  style={{
                    height: 6 + o.tamano * 1.6,
                    background: o.lado === 'compra' ? VERDE : ROJO,
                  }}
                />
                <span className="text-white/70 truncate flex-1">{o.actor}</span>
                <span style={{ color: o.lado === 'compra' ? VERDE : ROJO }}>
                  {o.lado === 'compra' ? '+' : '−'}
                  {coinsCorto(o.coins)}
                </span>
                <span className="text-white/25 tabular-nums hidden sm:inline">
                  {new Date(o.created_at).toLocaleTimeString('es', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
