'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Trophy, Coins } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { getMyProfile } from '@/lib/data'
import { getTareas, getTienda, getProgreso, coinsCorto } from '@/lib/economia'
import type { Tarea, ItemTienda, Progreso } from '@/lib/economia'
import type { Profile } from '@/lib/types'
import TiendaCoins from '@/components/comunidad/TiendaCoins'
import Tareas from '@/components/comunidad/Tareas'
import GraficoMercado from '@/components/comunidad/GraficoMercado'
import ComoGano from '@/components/comunidad/ComoGano'
import Duelos from '@/components/comunidad/Duelos'
import AvisoCorreoDiscord from '@/components/auth/AvisoCorreoDiscord'

/**
 * ELITE COIN: la pagina principal donde se gana, cobra y ve el progreso.
 * 
 * Antes: Comunidad (ranking + tareas + tienda + mercado)
 * Ahora: ELITE COIN (todo lo que veras y tocara para ganar coins)
 * 
 * El titulo y la identidad visual ahora dice ELITE COIN con animacion de rayos
 * que parpadean al entrar, para llamar la atencion sobre quien manda en la
 * economia y que premio se lleva.
 */

/*
  AQUI HABIA "RayosNeon" Y SE HA QUITADO.
  ---------------------------------------
  Era una capa `fixed` a z-40, o sea POR ENCIMA del contenido, con tres
  circulos y un cuadrado de 128 px animados. En el movil el cuadrado caia justo
  sobre el titular y los circulos cruzaban el texto: no se podia leer la
  pagina.

  Ademas su animacion iba de opacidad 0 a 0 (`animate` usaba `encendido` para
  aparecer, pero el valor de reposo tambien era 0), asi que lo que se veia era
  un parpadeo y nada mas.

  El ambiente ya lo pone el campo de estrellas del fondo, que va DETRAS del
  contenido y no tapa nada. Adornar por encima del texto no es adornar.
*/

export default function ComunidadPage() {
  const { user, isAuthed, signIn } = useAuth()

  const [tareas, setTareas] = useState<Tarea[]>([])
  const [progreso, setProgreso] = useState<Map<string, Progreso>>(new Map())
  const [tienda, setTienda] = useState<ItemTienda[]>([])
  const [perfil, setPerfil] = useState<Profile | null>(null)
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null)

  const cargar = useCallback(async () => {
    const [ts, sh, cb, pf] = await Promise.all([
      getTareas(),
      getTienda(),
      isAuthed ? getProgreso() : Promise.resolve(new Map<string, Progreso>()),
      isAuthed ? getMyProfile() : Promise.resolve(null),
    ])
    setTareas(ts)
    setTienda(sh)
    setProgreso(cb)
    setPerfil(pf)
    setCargando(false)
  }, [isAuthed])

  useEffect(() => {
    cargar()
  }, [cargar])

  // El aviso se va solo. Un mensaje que hay que cerrar a mano acaba tapando la
  // tienda justo después de canjear, que es cuando se quiere seguir mirar.
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 4500)
    return () => clearTimeout(t)
  }, [aviso])

  const tras = (texto: string, ok: boolean) => {
    setAviso({ texto, ok })
    if (ok) cargar()
  }

  const saldo = perfil?.points ?? 0
  const esMiembro = !!perfil?.is_member

  return (
    <div className="min-h-screen pt-24 pb-24">
      <div className="section-container">
        {/* Cabecera */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-elite-gold/10 border border-elite-gold/30 mb-4">
            <Trophy className="w-4 h-4 text-elite-gold" />
            <span className="text-sm font-medium text-elite-gold">ELITE COIN</span>
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl gradient-text mb-3">
            Juega, gana coins, cobra premios
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto">
            Gana Elite Coin jugando PvP y estando activo en el Discord. Cámbialas por diamantes
            reales. Todo lo patrocina el clan{' '}
            <span className="text-elite-primary font-semibold">La Elite PvP</span>.
          </p>

          {isAuthed ? (
            <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10">
              <Coins className="w-4 h-4 text-elite-gold" />
              <span className="font-mono font-bold text-elite-gold tabular-nums">
                {coinsCorto(saldo)}
              </span>
              <span className="text-white/40 text-sm">Elite Coin</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
            <button
              onClick={signIn}
              className="mt-6 inline-flex items-center gap-3 rounded-xl px-6 py-3.5 font-display font-bold text-base text-white transition-transform hover:scale-[1.03] active:scale-100"
              style={{
                background: 'linear-gradient(135deg,#5865F2,#4148c4)',
                boxShadow: '0 10px 30px rgba(88,101,242,.35)',
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.213.382-.46.898-.63 1.307a18.27 18.27 0 0 0-5.51 0A12.6 12.6 0 0 0 9.11 3 19.74 19.74 0 0 0 4.677 4.37C1.83 8.59 1.05 12.7 1.47 16.75a19.9 19.9 0 0 0 6.04 3.04c.49-.66.927-1.36 1.302-2.096-.716-.27-1.4-.6-2.043-.998.171-.125.338-.256.5-.39a14.2 14.2 0 0 0 12.142 0c.164.136.33.267.5.39-.644.4-1.327.73-2.044.999.375.736.81 1.436 1.302 2.096a19.86 19.86 0 0 0 6.046-3.04c.47-4.67-.787-8.74-3.135-12.381ZM8.52 14.33c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.335-.955 2.42-2.157 2.42Zm6.96 0c-1.183 0-2.157-1.085-2.157-2.42 0-1.334.955-2.42 2.157-2.42 1.21 0 2.176 1.095 2.157 2.42 0 1.335-.946 2.42-2.157 2.42Z" />
              </svg>
              Únete con Discord y empieza a ganar
            </button>
            <AvisoCorreoDiscord className="mt-3 max-w-xs" />
            </div>
          )}
        </motion.header>

        {/* Aviso flotante de cobros y canjes */}
        {aviso && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl backdrop-blur font-display font-semibold text-sm ${
              aviso.ok
                ? 'bg-elite-success/15 border-elite-success/40 text-elite-success'
                : 'bg-elite-danger/15 border-elite-danger/40 text-elite-danger'
            }`}
          >
            {aviso.texto}
          </motion.div>
        )}

        {/* ORDEN DE LA PAGINA
            1. Cómo se gana + qué se lleva + cómo. Los tres bloques que
               convierten a alguien que llega nuevo, arriba y compactos.
            2. Quién va ganando y qué está pasando ahora mismo.
            3. El gráfico, al final: es el espejo de todo lo anterior, no una
               instrucción, y ocupa mucho alto.

            Los bloques largos llevan tope de altura y scroll propio: sin él,
            siete premios y veinte tareas empujaban el ranking fuera de la
            pantalla y había que deslizar muchísimo para llegar a lo importante. */}
        <div className="mb-5">
          <ComoGano />
        </div>

        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <Tareas
            tareas={tareas}
            progreso={progreso}
            autenticado={isAuthed}
            esMiembro={esMiembro}
            onCobro={tras}
            onEntrar={signIn}
          />
          <TiendaCoins
            items={tienda}
            saldo={saldo}
            autenticado={isAuthed}
            esMiembro={esMiembro}
            onCanje={tras}
            onEntrar={signIn}
          />
        </div>

        {/* Ranking de Elite Coin - AHORA es el foco principal, no un enlace oculto.
            Antes ocupaba media pantalla repitiendo algo que ya tiene su sitio en /tops.
            Queda el resumen rápido con los tres primeros puestos. */}
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <Duelos />
          <Link
            href="/tops"
            className="ff-panel flex flex-col items-center justify-center gap-2 p-8 text-center
                       group transition-transform hover:-translate-y-1"
          >
            <Trophy className="w-8 h-8 text-elite-gold" />
            <span className="font-display font-bold text-xl uppercase text-elite-ice">
              Top Elite Coin
            </span>
            <span className="text-white/40 text-sm">
              Quién manda en la economía del clan, con el resto de rankings.
            </span>
            <span className="mt-1 text-elite-primary text-sm font-semibold
                             group-hover:translate-x-1 transition-transform">
              Ver ranking →
            </span>
          </Link>
        </div>

        <GraficoMercado />

      </div>
    </div>
  )
}