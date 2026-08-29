'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Coins } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { getMyProfile } from '@/lib/data'
import { getTop, getTareas, getTareasCobradas, getTienda, coinsCorto } from '@/lib/economia'
import type { FilaTop, Tarea, ItemTienda } from '@/lib/economia'
import type { Profile } from '@/lib/types'
import TopCoins from '@/components/comunidad/TopCoins'
import TiendaCoins from '@/components/comunidad/TiendaCoins'
import Tareas from '@/components/comunidad/Tareas'
import GraficoMercado from '@/components/comunidad/GraficoMercado'

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
  const [cobradas, setCobradas] = useState<Set<string>>(new Set())
  const [tienda, setTienda] = useState<ItemTienda[]>([])
  const [perfil, setPerfil] = useState<Profile | null>(null)
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null)

  const cargar = useCallback(async () => {
    const [t, ts, sh, cb, pf] = await Promise.all([
      getTop(50),
      getTareas(),
      getTienda(),
      isAuthed ? getTareasCobradas() : Promise.resolve(new Set<string>()),
      isAuthed ? getMyProfile() : Promise.resolve(null),
    ])
    setTop(t)
    setTareas(ts)
    setTienda(sh)
    setCobradas(cb)
    setPerfil(pf)
    setCargando(false)
  }, [isAuthed])

  useEffect(() => {
    cargar()
  }, [cargar])

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

          {isAuthed && (
            <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10">
              <Coins className="w-4 h-4 text-elite-gold" />
              <span className="font-mono font-bold text-elite-gold tabular-nums">
                {coinsCorto(saldo)}
              </span>
              <span className="text-white/40 text-sm">Elite Coin</span>
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

        {/* LO PRIMERO: quién gana y qué se lleva, uno al lado del otro */}
        <div className="grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-6 mb-6">
          <TopCoins filas={top} yo={user?.id} cargando={cargando} />
          <TiendaCoins
            items={tienda}
            saldo={saldo}
            autenticado={isAuthed}
            esMiembro={esMiembro}
            onCanje={tras}
            onEntrar={signIn}
          />
        </div>

        {/* EL CÓMO */}
        <div className="mb-6">
          <Tareas
            tareas={tareas}
            cobradas={cobradas}
            autenticado={isAuthed}
            esMiembro={esMiembro}
            onCobro={tras}
            onEntrar={signIn}
          />
        </div>

        {/* EL ESPEJO: el mercado moviéndose con lo que hace la comunidad */}
        <GraficoMercado />

        {!isAuthed && (
          <div className="mt-8 text-center">
            <button onClick={signIn} className="btn-primary">
              Entrar con Discord y empezar a ganar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
