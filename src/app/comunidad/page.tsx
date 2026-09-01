'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Trophy, Coins } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { getMyProfile } from '@/lib/data'
import { getTareas, getTienda, getProgreso, coinsCorto, getTop, getCasa, verCasaEnTop, type FilaTop } from '@/lib/economia'
import type { Tarea, ItemTienda, Progreso } from '@/lib/economia'
import type { Profile } from '@/lib/types'
import TiendaCoins from '@/components/comunidad/TiendaCoins'
import CompraCoins from '@/components/store/CompraCoins'
import Tareas from '@/components/comunidad/Tareas'
import GraficoMercado from '@/components/comunidad/GraficoMercado'
import ComoGano from '@/components/comunidad/ComoGano'
import Duelos from '@/components/comunidad/Duelos'
import TopCoins from '@/components/comunidad/TopCoins'
import CambioHonor from '@/components/comunidad/CambioHonor'
import Boosters from '@/components/comunidad/Boosters'

/**
 * ELITE COIN: la pagina principal donde se gana, cobra y ve el progreso.
 *
 * ORDEN (el mismo en movil y en PC):
 *   1. Tienda Elite
 *   2. Duelos PvP + Top Elite Coin
 *   3. Como gano Elite Coin
 *   4. Tareas
 *   5. Boosters de Discord
 *   6. Cambiar honor por coins
 *   7. Grafico del mercado
 *   8. Top Elite Coin (enlace a /tops)
 *
 * En PC no cambia el orden, cambia el ANCHO: los duelos y el top van a dos
 * columnas, y la lista de tareas tambien. Reordenar por tamano de pantalla
 * obligaria a mantener dos historias distintas de la misma pagina.
 */

export default function ComunidadPage() {
  const { user, isAuthed, signIn } = useAuth()

  const [tareas, setTareas] = useState<Tarea[]>([])
  const [progreso, setProgreso] = useState<Map<string, Progreso>>(new Map())
  const [tienda, setTienda] = useState<ItemTienda[]>([])
  const [topCoins, setTopCoins] = useState<FilaTop[]>([])
  const [perfil, setPerfil] = useState<Profile | null>(null)
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null)
  const [visibleTop, setVisibleTop] = useState(true)

  const cargar = useCallback(async () => {
    const [ts, sh, cb, tc, pf, casa] = await Promise.all([
      getTareas(),
      getTienda(),
      isAuthed ? getProgreso() : Promise.resolve(new Map<string, Progreso>()),
      getTop(),
      isAuthed ? getMyProfile() : Promise.resolve(null),
      getCasa(),
    ])
    setTareas(ts)
    setTienda(sh)
    setProgreso(cb)
    setTopCoins(tc)
    setPerfil(pf)
    setVisibleTop(casa?.visible_top !== false)
    setCargando(false)
  }, [isAuthed])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 4500)
    return () => clearTimeout(t)
  }, [aviso])

  const avisar = (t: string) => {
    setAviso({ texto: t, ok: true })
    const tRef = setTimeout(() => setAviso(null), 3000)
    return () => clearTimeout(tRef)
  }

  const tras = (texto: string, ok: boolean) => {
    setAviso({ texto, ok })
    if (ok) cargar()
  }

  const saldo = perfil?.points ?? 0
  const esMiembro = !!perfil?.is_member
  const esBooster = !!perfil?.booster_hasta && new Date(perfil.booster_hasta) > new Date()

  // Las de booster salen de la lista general y van a su propia seccion, donde
  // el trato se explica antes de enseñar el candado.
  const tareasNormales = tareas.filter((t) => t.publico !== 'booster')
  const tareasBooster = tareas.filter((t) => t.publico === 'booster')

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

        {/* ═══════════════════════════════════════════════════════════
            ORDEN DE LA PAGINA (movil primero):
            1. Tienda Elite — el premio, que es el motivo de todo lo demas
            2. Duelos PvP + Top Elite Coin — la prueba de que se juega de verdad
            3. Comprar coins — la via rapida, para quien no quiere grindear
            4. Como gano — el como, para quien acaba de llegar
            5. Tareas — todo lo cobrable, en una sola lista
            6. Boosters — la palanca que duplica lo anterior
            7. Cambiar honor por coins
            8. Grafico del mercado
            9. Top Elite Coin (enlace a /tops)
           ═══════════════════════════════════════════════════════════ */}

        {/* 1. Tienda Elite — lo que se quiere conseguir. Sin ver el premio,
            la lista de tareas es trabajo sin razon. */}
        <div className="mb-5">
          <TiendaCoins
            items={tienda}
            saldo={saldo}
            autenticado={isAuthed}
            esMiembro={esMiembro}
            onCanje={tras}
            onEntrar={signIn}
          />
        </div>

        {/* 3. Duelos PvP + Top Elite Coin — la prueba de que esto lo juega
            gente de verdad, con nombres y cifras reales. */}
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <Duelos />
          <TopCoins filas={topCoins} yo={user?.id} />
        </div>

        {/* 3b. Comprar coins. Va justo despues del top: quien mira a los de
            arriba piensa "y yo cuando llego ahi" - la respuesta de pago va
            aqui, antes de la explicacion del como. */}
        <div className="mb-5">
          <CompraCoins />
        </div>

        {/* 4. Como gano — el como, para quien acaba de llegar. */}
        <div className="mb-5">
          <ComoGano />
        </div>

        {/* 5. Tareas + 6. Boosters, juntos y en este orden.
            Primero todo lo que se puede cobrar, y justo despues la palanca que
            lo duplica. Al reves, el boost seria una oferta sobre algo que
            todavia no se ha visto. */}
        <div className="mb-5">
          <Tareas
            tareas={tareasNormales}
            progreso={progreso}
            autenticado={isAuthed}
            esMiembro={esMiembro}
            onCobro={tras}
            onEntrar={signIn}
          />
        </div>

        <div className="mb-5">
          <Boosters
            tareas={tareasBooster}
            progreso={progreso}
            autenticado={isAuthed}
            esBooster={esBooster}
            onCobro={tras}
            onEntrar={signIn}
          />
        </div>

        {/* 7. Cambiar honor por coins. */}
        <div className="mb-5">
          <CambioHonor autenticado={isAuthed} onCambio={tras} />
        </div>

        {/* 8. Grafico del mercado. */}
        <section className="card-glow p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-xl">Mercado</h2>
              <p className="text-white/40 text-sm">
                Vender baja el precio, comprar lo sube. Tus operaciones salen en la cinta con billetera anónima.
              </p>
            </div>
            <button
              onClick={() => {
                const nuevo = !visibleTop
                verCasaEnTop(nuevo).then((r) => {
                  if (r.ok) {
                    setVisibleTop(nuevo)
                    avisar(nuevo ? 'Casa visible en el top ✓' : 'Casa ocultada del top ✓')
                  } else {
                    avisar(r.error || 'Error al cambiar visibilidad')
                  }
                })
              }}
              className={`px-4 py-2 rounded-lg border font-display font-bold text-sm transition-colors shrink-0 ${
                visibleTop
                  ? 'border-elite-gold/40 text-elite-gold hover:bg-elite-gold/10'
                  : 'border-white/20 text-white/40 hover:bg-white/5'
              }`}
            >
              {visibleTop ? '👁 Visible en Top' : '🚫 Oculto del Top'}
            </button>
          </div>
          <GraficoMercado />
        </section>

        {/* 9. Top Elite Coin (enlace a /tops) */}
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
    </div>
  )
}
