'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Member } from '@/lib/types'
import { RankEmblem } from '@/components/RankEmblem'
import {
  MODOS, PERIODOS, armasDe, tieneArmas, nombreArma,
  type Modo, type Periodo,
} from '@/lib/armas'

/**
 * El personaje del jugador, a pantalla completa.
 *
 * El bot recorta el outfit del propio perfil dentro del juego, asi que esto es
 * el personaje REAL de esa persona, con su mascara, su ropa y su mascota. Es
 * lo que un jugador de Free Fire quiere enseñar, y hasta ahora la web no tenia
 * ni una imagen suya.
 */
export default function OutfitModal({
  member, onClose,
}: { member: Member | null; onClose: () => void }) {
  // Escape cierra, y mientras esta abierto no se desplaza el fondo.
  useEffect(() => {
    if (!member) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', tecla)
    return () => {
      document.body.style.overflow = previo
      window.removeEventListener('keydown', tecla)
    }
  }, [member, onClose])

  const [modo, setModo] = useState<Modo>('br')
  const [periodo, setPeriodo] = useState<Periodo>('temp')

  const armas = useMemo(
    () => (member ? armasDe(member, modo, periodo) : []),
    [member, modo, periodo]
  )
  const maxKills = armas[0]?.kills || 1

  const imagen = member?.outfit_image_url || member?.avatar_url

  return (
    <AnimatePresence>
      {member && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(8,8,10,0.86)', backdropFilter: 'blur(10px)' }}
          role="dialog"
          aria-modal="true"
          aria-label={`Personaje de ${member.nickname}`}
        >
          {/* El boton vive en la CAPA, no en la tarjeta. Dentro de la tarjeta
              no servia: framer-motion le aplica un transform, y un elemento
              con transform pasa a ser el marco de referencia de sus hijos
              `fixed`, asi que el boton se posicionaba respecto a la tarjeta y
              no respecto a la pantalla. En movil quedaba descolocado. */}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="fixed top-5 right-5 z-[60] w-11 h-11 sm:w-9 sm:h-9 rounded-full flex items-center justify-center bg-black/70 backdrop-blur border border-white/15 hover:border-elite-primary/60 transition-colors"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
          <motion.div
            initial={{ scale: 0.94, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="card relative w-full max-w-3xl max-h-[90vh] overflow-y-auto sm:overflow-hidden flex flex-col sm:flex-row"
          >

            {/* El personaje */}
            {/* En movil el personaje va arriba con alto acotado (42vh) y
                CENTRADO: con items-end y un alto fijo mayor que el hueco, la
                imagen se recortaba por arriba y solo se veian las piernas.
                En escritorio se mantiene apoyado abajo, que es como luce. */}
            <div className="relative shrink-0 sm:flex-1 h-[42vh] sm:h-auto sm:min-h-[520px] flex items-center sm:items-end justify-center overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(60% 50% at 50% 60%, rgba(225,29,60,0.16), transparent 70%)',
                }}
              />
              {imagen ? (
                <motion.img
                  src={imagen}
                  alt={`Personaje de ${member.nickname}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.5 }}
                  className="relative max-h-full sm:max-h-[520px] max-w-full w-auto object-contain drop-shadow-2xl"
                />
              ) : (
                <p className="relative text-white/40 text-sm p-8 text-center">
                  El bot todavía no ha fotografiado a este jugador.
                  <br />
                  Aparecerá en cuanto pase por su perfil.
                </p>
              )}
            </div>

            {/* Su ficha, con sus armas */}
            <div className="sm:w-[19rem] shrink-0 p-5 sm:border-l border-white/[0.07] flex flex-col gap-4 sm:overflow-y-auto sm:max-h-[88vh]">
              <div>
                <p className="font-display font-bold text-2xl leading-tight">
                  {member.nickname}
                </p>
                {member.level ? (
                  <p className="text-white/45 text-sm">Nivel {member.level}</p>
                ) : null}
              </div>

              {member.rank && (
                <div className="flex items-center gap-2">
                  <RankEmblem rank={member.rank} size={26} />
                  <span className="font-semibold text-sm">{member.rank}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                {([
                  ['K/D', member.kd_ratio?.toFixed(2)],
                  ['Kills', member.kills?.toLocaleString('es')],
                  ['Booyahs', member.booyahs?.toLocaleString('es')],
                  ['Headshots', member.headshots?.toLocaleString('es')],
                ] as const).map(([etq, val]) => (
                  <div key={etq} className="rounded-lg bg-white/[0.05] border border-white/[0.07] px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-white/40">{etq}</p>
                    <p className="font-mono tabular-nums font-semibold">{val ?? '—'}</p>
                  </div>
                ))}
              </div>

              {/* SUS armas. Aqui si tiene sentido: son las de esta persona,
                  ordenadas por lo que mas ha matado con ellas. Como top global
                  en /tops mezclaba a todo el clan y no se entendia nada. */}
              {tieneArmas(member) && (
                <div className="pt-1">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 mb-2">
                    Sus armas
                  </p>
                  <div className="flex gap-1.5 mb-3">
                    {MODOS.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setModo(o.id)}
                        className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
                          modo === o.id
                            ? 'bg-elite-primary text-white'
                            : 'bg-white/[0.05] text-white/50 hover:text-white/80'
                        }`}
                      >
                        {o.id.toUpperCase()}
                      </button>
                    ))}
                    <span className="w-px bg-white/10 mx-0.5" />
                    {PERIODOS.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setPeriodo(o.id)}
                        className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
                          periodo === o.id
                            ? 'bg-elite-primary text-white'
                            : 'bg-white/[0.05] text-white/50 hover:text-white/80'
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>

                  {armas.length === 0 ? (
                    <p className="text-white/35 text-xs">
                      Sin lecturas para esta combinación.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {armas.map((a, i) => (
                        <div
                          key={a.arma}
                          className="relative rounded-lg overflow-hidden border border-white/[0.06] px-2.5 py-1.5"
                        >
                          <motion.div
                            className="absolute inset-y-0 left-0 pointer-events-none"
                            initial={{ width: 0 }}
                            animate={{ width: `${(a.kills / maxKills) * 100}%` }}
                            transition={{ delay: 0.1 + i * 0.04, duration: 0.6 }}
                            style={{
                              background:
                                'linear-gradient(90deg, rgba(225,29,60,0.20), rgba(225,29,60,0.02))',
                            }}
                          />
                          <div className="relative flex items-center gap-2">
                            <span className="font-display font-semibold text-xs w-[4.5rem] shrink-0 truncate">
                              {nombreArma(a.arma)}
                            </span>
                            <span className="font-mono tabular-nums text-xs text-white/80 w-12 text-right">
                              {a.kills.toLocaleString('es')}
                            </span>
                            <span className="text-[9px] text-white/30">kills</span>
                            {a.headshot > 0 && (
                              <span className="ml-auto font-mono tabular-nums text-[10px] text-elite-gold shrink-0">
                                {a.headshot.toFixed(0)}% hs
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
