'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Coins } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { getMyProfile, subscribeToTable } from '@/lib/data'
import { getTop, getTareas, getProgreso, getTienda, coinsCorto } from '@/lib/economia'
import type { FilaTop, Tarea, ItemTienda, Progreso } from '@/lib/economia'
import type { Profile } from '@/lib/types'
import TopCoins from '@/components/comunidad/TopCoins'
import TiendaCoins from '@/components/comunidad/TiendaCoins'
import Tareas from '@/components/comunidad/Tareas'
import GraficoMercado from '@/components/comunidad/GraficoMercado'
import ComoGano from '@/components/comunidad/ComoGano'
import Duelos from '@/components/comunidad/Duelos'
import AvisoCorreoDiscord from '@/components/auth/AvisoCorreoDiscord'

/**
 * Comunidad: el ranking, la tienda, las tareas y el mercado.
 *
 * POR QUÉ ESTE ORDEN
 * ------------------
 * Al entrar tienen que verse DOS cosas a la vez, sin bajar: quién va ganando
 * (top) y qué se llevan (tienda). Esa pareja es la promesa de la página. Debajo
 * viene el "cómo" —las tareas— y al final el gráfico del mercado, que es el
 * adorno vivo: no explica nada que haga falta para jugar, pero demuestra que la
 * economía se mueve de verdad.
 *
 * En móvil el orden se apila igual: top, tienda, tareas, gráfico.
 */

export default function ComunidadPage() {
  const { user, isAuthed, signIn } = useAuth()

  const [top, setTop] = useState<FilaTop[]>([])
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [progreso, setProgreso] = useState<Map<string, Progreso>>(new Map())
  const [tienda, setTienda] = useState<ItemTienda[]>([])
  const [perfil, setPerfil] = useState<Profile | null>(null)
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null)

  const cargar = useCallback(async () => {
    const [t, ts, sh, cb, pf] = await Promise.all([
      getTop(50),
      getTareas(),
      getTienda(),
      isAuthed ? getProgreso() : Promise.resolve(new Map<string, Progreso>()),
      isAuthed ? getMyProfile() : Promise.resolve(null),
    ])
    setTop(t)
    setTareas(ts)
    setTienda(sh)
    setProgreso(cb)
    setPerfil(pf)
    setCargando(false)
  }, [isAuthed])

  useEffect(() => {
    cargar()
  }, [cargar])

  /**
   * El top se mueve solo.
   *
   * Sin esto, alguien que deja la pestaña abierta ve un ranking congelado y la
   * página parece muerta justo cuando más gente está jugando. Se escucha el
   * canal de Supabase y se recarga solo el ranking: recargarlo todo traería de
   * vuelta la tienda y las tareas sin motivo, y en móvil eso se nota.
   */
  useEffect(() => {
    const off = subscribeToTable('profiles', async () => setTop(await getTop(50)))
    return off
  }, [])

  // El aviso se va solo. Un mensaje que hay que cerrar a mano acaba tapando la
  // tienda justo después de canjear, que es cuando se quiere seguir mirando.
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
            <span className="text-sm font-medium text-elite-gold">COMUNIDAD · ELITE COIN</span>
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
            /* Arriba y grande, no escondido al final de la página: sin cuenta
               enlazada nada de lo que hay debajo se puede cobrar, así que este
               es LA acción de la pantalla para quien llega nuevo. */
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
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl border backdrop-blur font-display font-semibold text-sm ${
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

        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <TopCoins filas={top} yo={user?.id} cargando={cargando} />
          <Duelos />
        </div>

        <GraficoMercado />

      </div>
    </div>
  )
}
