'use client'

import { motion } from 'framer-motion'
import { MessagesSquare, Mic, Swords, Gift } from 'lucide-react'

/**
 * "¿Cómo gano?" — el circuito completo en cuatro pasos.
 *
 * POR QUÉ HACE FALTA
 * ------------------
 * La página enseña un ranking, una tienda y una lista de tareas, pero en
 * ningún sitio decía cómo se conectan las tres cosas. Quien entra por primera
 * vez ve premios que cuestan miles de coins y una lista de misiones sueltas, y
 * no llega a la conclusión de que estar en el Discord esta noche ya le está
 * pagando. Esa conclusión es toda la conversión de la página.
 *
 * LA ANIMACIÓN NO ES ADORNO
 * -------------------------
 * Los pasos entran en cadena, uno detrás de otro, porque el orden ES el
 * mensaje: entras → hablas y juegas → sumas → canjeas. Una tarjeta estática
 * con cuatro iconos se lee como un menú; entrando en secuencia se lee como un
 * camino. La flecha que recorre la línea remata la idea de circuito.
 *
 * Se anima una sola vez al aparecer (`whileInView` + `once`), no en bucle:
 * un bucle en pantalla compite con el gráfico y cansa a los tres minutos.
 */

const PASOS = [
  { icono: MessagesSquare, titulo: 'Entra al Discord', texto: 'Con tu cuenta enlazada, todo lo que hagas ahí empieza a contar.', color: '#5865F2' },
  { icono: Mic, titulo: 'Habla y conéctate', texto: 'Cada minuto en voz y cada mensaje suman Elite Coin. Sin hacer nada raro.', color: '#5b9dff' },
  { icono: Swords, titulo: 'Juega PvP', texto: 'Tus kills, headshots y Booyahs reales desbloquean las tareas grandes.', color: '#f0b429' },
  { icono: Gift, titulo: 'Canjea diamantes', texto: 'Cambia tus coins por recargas de verdad. Lo paga el clan.', color: '#4ade80' },
]

export default function ComoGano() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-elite-primary/[0.07] via-transparent to-elite-gold/[0.05] p-4 sm:p-5">
      {/* Rejilla de fondo: da profundidad sin competir con el contenido. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }}
      />

      <div className="relative">
        <h2 className="font-display font-bold text-lg sm:text-xl text-center mb-5">
          <span className="gradient-text">¿Cómo gano Elite Coin?</span>
          <span className="text-white/35 font-normal text-sm ml-2">Cuatro pasos.</span>
        </h2>

        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* La línea que une los pasos. Solo en escritorio: en móvil los pasos
              se apilan en dos columnas y una línea horizontal mentiría sobre
              el recorrido. */}
          <div className="hidden lg:block absolute top-5 left-[12%] right-[12%] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <motion.div
            className="hidden lg:block absolute top-5 h-px w-16 bg-gradient-to-r from-transparent via-elite-gold to-transparent"
            initial={{ left: '10%', opacity: 0 }}
            whileInView={{ left: ['10%', '82%'], opacity: [0, 1, 1, 0] }}
            viewport={{ once: true }}
            transition={{ duration: 2.2, delay: 0.9, ease: 'easeInOut' }}
          />

          {PASOS.map((p, i) => {
            const Icono = p.icono
            return (
              <motion.div
                key={p.titulo}
                className="step-neon relative text-center p-4"
                style={{ '--step-color': p.color } as React.CSSProperties}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.16, duration: 0.45, ease: 'easeOut' }}
              >
                {/* Step number - large display */}
                <span
                  className="font-display font-extrabold text-3xl sm:text-4xl block mb-2 opacity-15"
                  style={{ color: p.color }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                <div
                  className="mx-auto w-10 h-10 rounded-xl grid place-items-center mb-2 border"
                  style={{
                    borderColor: p.color + '55',
                    background: p.color + '14',
                    boxShadow: `0 0 28px ${p.color}22`,
                  }}
                >
                  <Icono className="w-5 h-5" style={{ color: p.color }} />
                </div>

                <h3 className="font-display font-bold text-xs sm:text-sm mb-0.5" style={{ color: p.color }}>
                  {p.titulo}
                </h3>
                <p className="hidden sm:block text-white/40 text-[11px] leading-snug px-1">
                  {p.texto}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
