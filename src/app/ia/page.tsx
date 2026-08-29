'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, Crosshair, RotateCcw } from 'lucide-react'
import { responder, tamanoBase, type Respuesta } from '@/lib/ia/motor'
import { SUGERENCIAS } from '@/lib/ia/base'
import type { ResultadoSensi } from '@/lib/ia/sensi'
import type { ResultadoBoton } from '@/lib/ia/boton'

interface Mensaje {
  id: number
  de: 'tu' | 'ia'
  texto: string
  seguir?: string[]
  sensi?: ResultadoSensi
  botones?: { modelo: string; pulgadas: number; opciones: Record<string, ResultadoBoton> }
}

const BIENVENIDA: Mensaje = {
  id: 0,
  de: 'ia',
  texto:
    'Soy TOKIO IA. Solo hablo de Free Fire: armas, personajes, mascotas, rango, ' +
    'rotación, sensibilidad y ajustes.\n\nDime tu modelo de celular y te calculo ' +
    'tu sensi, o pregúntame lo que quieras del juego.',
  seguir: SUGERENCIAS.slice(0, 3),
}

/** Ficha de sensibilidad: los números merecen tabla, no un párrafo. */
function FichaSensi({ r }: { r: ResultadoSensi }) {
  const filas: [string, number][] = [
    ['General', r.sensi.general],
    ['Punto rojo', r.sensi.puntoRojo],
    ['Mira 2x', r.sensi.mira2x],
    ['Mira 4x', r.sensi.mira4x],
    ['Francotirador', r.sensi.sniper],
    ['Vista libre', r.sensi.vistaLibre],
  ]
  const color = { alta: '#46a758', media: '#e8b33c', baja: '#e11d3c' }[r.gama]

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2 mb-3">
        <Crosshair className="w-4 h-4 text-elite-primary" />
        <span className="font-display font-semibold">{r.modelo}</span>
        <span
          className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ color, background: `${color}1a` }}
        >
          gama {r.gama}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {filas.map(([etq, val]) => (
          <div
            key={etq}
            className="rounded-lg bg-white/[0.05] border border-white/[0.07] px-2.5 py-1.5 flex items-baseline justify-between gap-2"
          >
            <span className="text-[11px] text-white/50">{etq}</span>
            <span className="font-mono tabular-nums font-semibold text-elite-primary">{val}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-elite-primary/[0.08] border border-elite-primary/25 px-3 py-2 mb-3">
        <span className="text-[11px] text-white/50">DPI recomendado </span>
        <span className="font-mono tabular-nums font-semibold text-elite-primary">{r.sensi.dpi}</span>
      </div>

      <p className="text-[13px] text-white/65 leading-relaxed mb-2">
        <span className="text-white/40">HUD: </span>{r.hud}
      </p>
      <ul className="space-y-1">
        {r.notas.map((n) => (
          <li key={n} className="text-[12px] text-white/45 leading-relaxed pl-3 relative">
            <span className="absolute left-0 text-elite-primary">·</span>{n}
          </li>
        ))}
      </ul>
    </div>
  )
}

const ETIQUETA_ESTILO: Record<string, { titulo: string; para: string }> = {
  preciso: { titulo: 'Preciso', para: 'Tapa menos pantalla. Para distancia media y larga.' },
  equilibrado: { titulo: 'Equilibrado', para: 'La huella cómoda del pulgar. Sirve a casi todos.' },
  agresivo: { titulo: 'Agresivo', para: 'Se acierta sin mirar. Para combate pegado.' },
}

/** Ficha del boton de disparo: tres opciones con su medida fisica. */
function FichaBoton({ b }: { b: { modelo: string; pulgadas: number; opciones: Record<string, ResultadoBoton> } }) {
  const orden = ['preciso', 'equilibrado', 'agresivo']
  const recomendado = b.opciones.equilibrado

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2 mb-1">
        <Crosshair className="w-4 h-4 text-elite-primary" />
        <span className="font-display font-semibold">{b.modelo}</span>
        <span className="text-[11px] text-white/35">{b.pulgadas}&quot;</span>
      </div>
      <p className="text-[13px] text-white/60 leading-relaxed mb-3">
        {recomendado.explicacion}
      </p>

      <div className="space-y-1.5 mb-3">
        {orden.map((k) => {
          const o = b.opciones[k]
          const meta = ETIQUETA_ESTILO[k]
          const esRecomendado = k === 'equilibrado'
          return (
            <div
              key={k}
              className="rounded-lg border px-3 py-2"
              style={{
                borderColor: esRecomendado ? 'rgba(225,29,60,0.4)' : 'rgba(255,255,255,0.08)',
                background: esRecomendado ? 'rgba(225,29,60,0.07)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold">
                  {meta.titulo}
                  {esRecomendado && (
                    <span className="ml-1.5 text-[9px] uppercase tracking-wider text-elite-primary">
                      recomendado
                    </span>
                  )}
                </span>
                <span className="font-mono tabular-nums font-semibold text-elite-primary shrink-0">
                  {o.porcentaje}%
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] text-white/40">{meta.para}</span>
                <span className="text-[10px] text-white/30 font-mono shrink-0">≈{o.mm} mm</span>
              </div>
            </div>
          )
        })}
      </div>

      {recomendado.avisos.length > 0 && (
        <ul className="space-y-1 mb-2">
          {recomendado.avisos.map((a) => (
            <li key={a} className="text-[12px] text-white/50 leading-relaxed pl-3 relative">
              <span className="absolute left-0 text-elite-primary">·</span>{a}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-white/30 leading-relaxed">
        Es un punto de partida calculado con las medidas de tu pantalla. Pruébalo
        en la Sala de entrenamiento y muévelo de 3 en 3 hasta que lo aciertes sin mirar.
      </p>
    </div>
  )
}

export default function TokioIA() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([BIENVENIDA])
  const [entrada, setEntrada] = useState('')
  const [pensando, setPensando] = useState(false)
  // El telefono del que se hablo por ultima vez. Permite que "¿y el boton?"
  // siga sabiendo de que equipo hablamos, como en una conversacion normal.
  const [ultimoModelo, setUltimoModelo] = useState<string | undefined>()
  const finRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const base = tamanoBase()

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensajes, pensando])

  const preguntar = (texto: string) => {
    const limpio = texto.trim()
    if (!limpio || pensando) return

    setMensajes((m) => [...m, { id: Date.now(), de: 'tu', texto: limpio }])
    setEntrada('')
    setPensando(true)

    // La respuesta se calcula al instante. La pausa es para que se pueda LEER
    // lo que uno acaba de escribir antes de que aparezca la contestación: sin
    // ella el texto salta de golpe y cuesta seguir la conversación.
    const r: Respuesta = responder(limpio, ultimoModelo)
    if (r.modeloDetectado) setUltimoModelo(r.modeloDetectado)
    const espera = 320 + Math.min(700, r.texto.length * 4)

    window.setTimeout(() => {
      setMensajes((m) => [
        ...m,
        { id: Date.now() + 1, de: 'ia', texto: r.texto, seguir: r.seguir, sensi: r.sensi, botones: r.botones },
      ])
      setPensando(false)
      inputRef.current?.focus()
    }, espera)
  }

  return (
    <div className="min-h-screen pt-20 pb-4 flex flex-col">
      <div className="section-container flex-1 flex flex-col max-w-3xl w-full">
        {/* Cabecera */}
        <div className="flex items-center gap-3 py-4 border-b border-white/[0.07]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-elite-primary to-elite-secondary flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-xl leading-tight">TOKIO IA</h1>
            <p className="text-[11px] text-white/40 truncate">
              {ultimoModelo
                ? `Hablando de tu ${ultimoModelo}`
                : `${base.entradas} temas · ${base.redacciones} respuestas · funciona sin conexión`}
            </p>
          </div>
          {mensajes.length > 1 && (
            <button
              onClick={() => { setMensajes([BIENVENIDA]); setUltimoModelo(undefined) }}
              className="ml-auto shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.07] transition-colors"
              aria-label="Empezar de nuevo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Conversación */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4">
          {mensajes.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={m.de === 'tu' ? 'flex justify-end' : ''}
            >
              {m.de === 'tu' ? (
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-elite-primary/90 px-4 py-2.5">
                  <p className="text-[15px] leading-relaxed">{m.texto}</p>
                </div>
              ) : (
                <div className="max-w-[92%]">
                  <div className="card px-4 py-3">
                    {m.texto && (
                      <p className="text-[15px] leading-relaxed whitespace-pre-line text-white/85">
                        {m.texto}
                      </p>
                    )}
                    {m.sensi && <FichaSensi r={m.sensi} />}
                    {m.botones && <FichaBoton b={m.botones} />}
                  </div>
                  {!!m.seguir?.length && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.seguir.map((s) => (
                        <button
                          key={s}
                          onClick={() => preguntar(s)}
                          className="text-[12px] px-2.5 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-elite-primary/50 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}

          <AnimatePresence>
            {pensando && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="card inline-flex items-center gap-1.5 px-4 py-3"
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-elite-primary"
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={finRef} />
        </div>

        {/* Entrada */}
        <form
          onSubmit={(e) => { e.preventDefault(); preguntar(entrada) }}
          className="sticky bottom-0 pt-2 pb-3 bg-elite-dark/95 cristal"
        >
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={entrada}
              onChange={(e) => setEntrada(e.target.value)}
              placeholder="Pregúntame de Free Fire…"
              aria-label="Tu pregunta"
              className="input flex-1"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!entrada.trim() || pensando}
              aria-label="Enviar"
              className="btn-primary !px-4 shrink-0 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
