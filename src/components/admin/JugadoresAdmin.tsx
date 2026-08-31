'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Plus, Minus, History, X, Coins } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { coinsCorto } from '@/lib/economia'

/**
 * Gestión de saldos: la lista de gente con Elite Coin y sus movimientos.
 *
 * PARA QUE SIRVE
 * --------------
 * Es la pantalla a la que se viene cuando alguien reclama. "Me quitaron coins",
 * "pagué y no me llegó", "gané la apuesta y no me pagaron". Hasta ahora la
 * única forma de mirarlo era entrar a Supabase y escribir SQL, y de resolverlo,
 * escribir un UPDATE a mano.
 *
 * POR QUÉ SE AJUSTA POR DIFERENCIA Y NO SE ESCRIBE EL TOTAL
 * --------------------------------------------------------
 * Escribir el saldo final parece más cómodo, pero borra lo que haya pasado
 * entre que se abrió la pantalla y se pulsó guardar: una tarea cobrada, una
 * apuesta ganada. Sumando o restando, esos movimientos se respetan.
 *
 * Y el motivo es obligatorio. Un ajuste sin explicación es exactamente lo que
 * no se puede defender cuando esa misma persona reclama dos semanas después.
 */

interface Jugador {
  id: string
  display_name: string | null
  username: string | null
  points: number
  is_member: boolean
  avatar_url: string | null
  free_fire_id: string | null
  discord_id: string | null
}

interface Movimiento {
  id: string
  type: string
  amount: number
  motivo: string | null
  created_at: string
}

/** Cómo se lee cada tipo de movimiento en el historial. */
const TIPO: Record<string, string> = {
  checkin: 'Check-in',
  link: 'Vinculación',
  challenge: 'Reto',
  task: 'Tarea',
  discord: 'Actividad Discord',
  redeem: 'Canje',
  apuesta: 'Apuesta',
  honor: 'Honor cambiado',
  premio: 'Premio de apuesta',
  admin: 'Ajuste manual',
}

export default function JugadoresAdmin({ avisar }: { avisar: (t: string) => void }) {
  const [lista, setLista] = useState<Jugador[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [historial, setHistorial] = useState<Movimiento[]>([])
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  // Saldo recien movido: {id: cuanto}. Sirve para enseñar el delta en la propia
  // fila unos segundos. Sin esto el unico rastro del ajuste era un aviso al
  // principio de la pagina, fuera de la vista.
  const [recien, setRecien] = useState<Record<string, number>>({})

  const sb = () => supabaseBrowser()

  const cargar = useCallback(async () => {
    const c = sb()
    if (!c) return
    const { data } = await c
      .from('profiles')
      .select('id, display_name, username, points, is_member, avatar_url, free_fire_id, discord_id')
      .order('points', { ascending: false })
      .limit(300)
    setLista((data as Jugador[]) || [])
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const verHistorial = async (id: string) => {
    if (abierto === id) {
      setAbierto(null)
      return
    }
    setAbierto(id)
    setCantidad('')
    setMotivo('')
    const c = sb()
    if (!c) return
    const { data } = await c.rpc('admin_historial', { p_profile: id, p_limite: 40 })
    setHistorial(Array.isArray(data) ? (data as Movimiento[]) : [])
  }

  const ajustar = async (id: string, signo: 1 | -1) => {
    const n = parseInt(cantidad.replace(/\D/g, ''), 10)
    if (!n || n <= 0) return avisar('Escribe una cantidad.')
    if (motivo.trim().length < 3) return avisar('Escribe el motivo del ajuste.')

    setOcupado(true)
    const c = sb()
    if (!c) return setOcupado(false)
    const { data, error } = await c.rpc('admin_ajustar_saldo', {
      p_profile: id,
      p_delta: n * signo,
      p_motivo: motivo.trim(),
    })
    setOcupado(false)

    const r = data as { ok?: boolean; error?: string; nombre?: string; despues?: number }
    if (error || !r?.ok) return avisar(error?.message || r?.error || 'No se pudo ajustar.')

    avisar(`${r.nombre}: ${signo > 0 ? '+' : '−'}${coinsCorto(n)} · queda en ${coinsCorto(r.despues ?? 0)}`)
    setCantidad('')
    setMotivo('')

    // El saldo se escribe EN LA FILA, sin volver a pedir la lista.
    //
    // Antes se llamaba a `cargar()`, que reordena por saldo: la persona que
    // acababas de tocar saltaba a otra posicion de la lista justo debajo del
    // cursor. Entre eso y que el aviso salia fuera de pantalla, un ajuste que
    // SI se habia aplicado parecia no haber hecho nada.
    const movido = (r.despues ?? 0) - (lista.find((x) => x.id === id)?.points ?? 0)
    setLista((prev) =>
      prev.map((x) => (x.id === id ? { ...x, points: r.despues ?? x.points } : x)),
    )
    setRecien((prev) => ({ ...prev, [id]: movido }))
    setTimeout(() => setRecien((prev) => {
      const { [id]: _, ...resto } = prev
      return resto
    }), 6000)

    // El historial si se refresca: el movimiento nuevo tiene que salir ahi.
    const c2 = sb()
    if (c2) {
      const { data: h } = await c2.rpc('admin_historial', { p_profile: id, p_limite: 40 })
      setHistorial(Array.isArray(h) ? (h as Movimiento[]) : [])
    }
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return lista
    return lista.filter((j) =>
      [j.display_name, j.username, j.free_fire_id, j.discord_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [lista, busqueda])

  const totalEnCirculacion = useMemo(
    () => lista.reduce((a, j) => a + (j.points || 0), 0),
    [lista]
  )

  return (
    <section className="card-glow p-6 mb-8">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="font-display font-bold text-xl">Jugadores y saldos</h2>
          <p className="text-white/40 text-sm mt-0.5">
            {lista.length} con cuenta ·{' '}
            <span className="text-elite-gold font-mono">{coinsCorto(totalEnCirculacion)}</span> coins
            en circulación
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-9 w-64"
            placeholder="Nombre, FF ID o Discord…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </header>

      <div className="divide-y divide-white/[0.05] max-h-[560px] overflow-y-auto">
        {filtrados.map((j) => {
          const nombre = j.display_name || j.username || 'Jugador'
          const activo = abierto === j.id
          return (
            <div key={j.id}>
              <div className="flex items-center gap-3 py-2.5">
                {j.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={j.avatar_url} alt="" className="w-8 h-8 rounded-full shrink-0" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-white/5 grid place-items-center text-xs font-display font-bold text-white/40 shrink-0">
                    {nombre.charAt(0).toUpperCase()}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-sm truncate">
                    {nombre}
                    {j.is_member && (
                      <span className="text-elite-primary text-[10px] ml-2">CLAN</span>
                    )}
                  </p>
                  <p className="text-white/30 text-[11px] font-mono truncate">
                    {j.free_fire_id ? `FF ${j.free_fire_id}` : 'sin vincular'}
                  </p>
                </div>

                <span className="flex items-center gap-2 shrink-0">
                  {recien[j.id] !== undefined && (
                    <span
                      className={`font-mono text-xs font-bold tabular-nums animate-slide-in-right ${
                        recien[j.id] >= 0 ? 'text-elite-success' : 'text-elite-danger'
                      }`}
                    >
                      {recien[j.id] >= 0 ? '+' : '−'}
                      {Math.abs(recien[j.id]).toLocaleString('es')}
                    </span>
                  )}
                  <span
                    className={`font-mono font-bold text-sm tabular-nums transition-colors duration-500 ${
                      recien[j.id] !== undefined ? 'text-elite-primary' : 'text-elite-gold'
                    }`}
                  >
                    {coinsCorto(j.points || 0)}
                  </span>
                </span>

                <button
                  onClick={() => verHistorial(j.id)}
                  className={`shrink-0 p-2 rounded transition-colors ${
                    activo ? 'text-elite-primary bg-elite-primary/10' : 'text-white/30 hover:text-white'
                  }`}
                  title="Historial y ajuste"
                >
                  {activo ? <X className="w-4 h-4" /> : <History className="w-4 h-4" />}
                </button>
              </div>

              {activo && (
                <div className="pb-4 pl-11 pr-1">
                  {/* Ajuste. La cantidad y el motivo se piden juntos, y ninguno
                      de los dos botones funciona sin los dos: es lo que impide
                      un ajuste a medias hecho con prisa. */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <input
                      className="input w-28"
                      inputMode="numeric"
                      placeholder="Coins"
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                    />
                    <input
                      className="input flex-1 min-w-[180px]"
                      placeholder="Motivo (queda registrado)"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                    <button
                      onClick={() => ajustar(j.id, 1)}
                      disabled={ocupado}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-elite-success/40 text-elite-success text-sm font-display font-bold hover:bg-elite-success/10 disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" /> Dar
                    </button>
                    <button
                      onClick={() => ajustar(j.id, -1)}
                      disabled={ocupado}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-elite-danger/40 text-elite-danger text-sm font-display font-bold hover:bg-elite-danger/10 disabled:opacity-40"
                    >
                      <Minus className="w-3.5 h-3.5" /> Quitar
                    </button>
                  </div>

                  {historial.length === 0 ? (
                    <p className="text-white/25 text-xs">Sin movimientos.</p>
                  ) : (
                    <ul className="space-y-1 max-h-56 overflow-y-auto">
                      {historial.map((m) => (
                        <li key={m.id} className="flex items-start gap-2 text-xs">
                          <span
                            className={`font-mono font-bold w-16 shrink-0 tabular-nums text-right ${
                              m.amount >= 0 ? 'text-elite-success' : 'text-elite-danger'
                            }`}
                          >
                            {m.amount >= 0 ? '+' : '−'}
                            {Math.abs(m.amount).toLocaleString('es')}
                          </span>
                          <span className="text-white/50 w-32 shrink-0">
                            {TIPO[m.type] || m.type}
                          </span>
                          <span className="text-white/30 flex-1 min-w-0 truncate">
                            {m.motivo || '—'}
                          </span>
                          <span className="text-white/20 shrink-0 tabular-nums">
                            {new Date(m.created_at).toLocaleDateString('es', {
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filtrados.length === 0 && (
          <p className="py-6 text-center text-white/30 text-sm">
            <Coins className="w-6 h-6 mx-auto mb-2 opacity-40" />
            Nadie coincide con esa búsqueda.
          </p>
        )}
      </div>
    </section>
  )
}
