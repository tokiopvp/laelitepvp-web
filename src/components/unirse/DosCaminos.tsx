'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Coins, Shield, ArrowRight, Check } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import AvisoCorreoDiscord from '@/components/auth/AvisoCorreoDiscord'

/**
 * Las dos cosas que la gente confunde, puestas una al lado de la otra.
 *
 * EL PROBLEMA QUE RESUELVE
 * ------------------------
 * "Unirse al clan" y "entrar con Discord" sonaban a lo mismo, así que muchos
 * mandaban la solicitud de ingreso creyendo que con eso ya tenían cuenta y
 * podían ganar Elite Coin. Luego no veían saldo por ningún lado y se iban
 * pensando que la web no funciona.
 *
 * Son cosas distintas y no dependen una de otra:
 *
 *   · Entrar con Discord → cuenta en la web. Instantáneo. Empiezas a ganar.
 *   · Solicitud de ingreso → que te acepten en el clan. La revisa una persona
 *     y tarda. NO crea cuenta ni da coins.
 *
 * Se explican JUNTAS y en paralelo porque la confusión nace de verlas por
 * separado: cada una suelta parece "la forma de entrar". Lado a lado, la
 * diferencia se lee en dos segundos.
 *
 * El orden no es casual: primero lo instantáneo y para todo el mundo; después
 * lo que exige aprobación. Quien solo quería jugar se queda en la primera y no
 * llega a mandar una solicitud que no necesitaba.
 */
export default function DosCaminos() {
  const { isAuthed, signIn } = useAuth()

  return (
    <div className="grid md:grid-cols-2 gap-5 mb-12">
      {/* CAMINO 1: jugar. Sin requisitos, sin esperar. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-elite-gold/25 bg-gradient-to-b from-elite-gold/[0.07] to-transparent p-6 flex flex-col"
      >
        <div className="flex items-center gap-2 mb-3">
          <Coins className="w-5 h-5 text-elite-gold" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-elite-gold">
            Al instante · para cualquiera
          </span>
        </div>

        <h2 className="font-display font-bold text-2xl mb-2">Jugar y ganar Elite Coin</h2>
        <p className="text-white/55 text-sm leading-relaxed mb-4">
          Entras con tu cuenta de Discord y ya está: ganas coins jugando y estando activo en el
          servidor, y las cambias por diamantes reales.
        </p>

        <ul className="space-y-1.5 text-sm text-white/70 mb-6">
          {['No hace falta que te acepten', 'Ganas coins desde el primer minuto', 'Puedes apostar en duelos PvP'].map(
            (t) => (
              <li key={t} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-elite-gold shrink-0 mt-0.5" />
                {t}
              </li>
            )
          )}
        </ul>

        {isAuthed ? (
          <Link
            href="/comunidad"
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 min-h-[48px] font-display font-bold border border-elite-gold/50 text-elite-gold hover:bg-elite-gold/10 transition-colors"
          >
            Ya tienes cuenta · ir a Comunidad <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <button
            onClick={signIn}
            className="mt-auto inline-flex items-center justify-center gap-3 rounded-xl px-5 py-3.5 min-h-[48px] font-display font-bold text-white transition-transform hover:scale-[1.02] active:scale-100"
            style={{
              background: 'linear-gradient(135deg,#5865F2,#4148c4)',
              boxShadow: '0 10px 26px rgba(88,101,242,.3)',
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.213.382-.46.898-.63 1.307a18.27 18.27 0 0 0-5.51 0A12.6 12.6 0 0 0 9.11 3 19.74 19.74 0 0 0 4.677 4.37C1.83 8.59 1.05 12.7 1.47 16.75a19.9 19.9 0 0 0 6.04 3.04c.49-.66.927-1.36 1.302-2.096-.716-.27-1.4-.6-2.043-.998.171-.125.338-.256.5-.39a14.2 14.2 0 0 0 12.142 0c.164.136.33.267.5.39-.644.4-1.327.73-2.044.999.375.736.81 1.436 1.302 2.096a19.86 19.86 0 0 0 6.046-3.04c.47-4.67-.787-8.74-3.135-12.381ZM8.52 14.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm6.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z" />
            </svg>
            Entrar con Discord
          </button>
        )}
        {!isAuthed && <AvisoCorreoDiscord className="mt-4" />}
      </motion.div>

      {/* CAMINO 2: el clan. Requiere que te acepten. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-2xl border border-elite-primary/25 bg-gradient-to-b from-elite-primary/[0.07] to-transparent p-6 flex flex-col"
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-elite-primary" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-elite-primary">
            Con aprobación · plazas limitadas
          </span>
        </div>

        <h2 className="font-display font-bold text-2xl mb-2">Entrar al clan</h2>
        <p className="text-white/55 text-sm leading-relaxed mb-4">
          El squad oficial que compite en torneos. Mandas una solicitud, la revisamos y te
          escribimos por WhatsApp.
        </p>

        <ul className="space-y-1.5 text-sm text-white/70 mb-6">
          {['Tus estadísticas salen en la web', 'Premios exclusivos de miembro', 'Juegas los torneos con el clan'].map(
            (t) => (
              <li key={t} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-elite-primary shrink-0 mt-0.5" />
                {t}
              </li>
            )
          )}
        </ul>

        <a
          href="#solicitud"
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 min-h-[48px] font-display font-bold border border-elite-primary/50 text-elite-primary hover:bg-elite-primary/10 transition-colors"
        >
          Mandar solicitud <ArrowRight className="w-4 h-4" />
        </a>

        {/* La frase que evita el malentendido, justo debajo del botón que lo
            provoca. Ponerla arriba del todo no funciona: nadie lee la
            introducción, pero sí lee lo que hay pegado al botón que va a pulsar. */}
        <p className="text-white/35 text-xs mt-3 leading-snug">
          Esto <strong className="text-white/60">no crea tu cuenta</strong> ni te da Elite Coin.
          Para eso, entra con Discord aquí al lado — puedes hacer las dos cosas.
        </p>
      </motion.div>
    </div>
  )
}
