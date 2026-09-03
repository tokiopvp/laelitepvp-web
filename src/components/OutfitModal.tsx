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
            <div className="relative shrink-0 sm:flex-1 h-[42vh] sm:h-auto flex items-center sm:items-end justify-center overflow-hidden bg-gradient-to-t from-black/40 to-transparent">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(60% 50% at 50% 60%, rgba(91,157,255,0.16), transparent 70%)',
                }}
              />
              {imagen ? (
                <motion.img
                  src={imagen}
                  alt={`Personaje de ${member.nickname}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.5 }}
                  className="relative h-full sm:h-[520px] max-w-full w-auto object-cover sm:object-contain object-bottom drop-shadow-2xl"
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
                        className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-lg transition-all ${
                          modo === o.id
                            ? 'bg-elite-primary text-white shadow-lg shadow-elite-primary/25'
                            : 'bg-white/[0.05] text-white/50 hover:text-white/80 hover:bg-white/[0.08]'
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
                        className={`px-2.5 py-1.5 text-[10px] font-semibold rounded-lg transition-all ${
                          periodo === o.id
                            ? 'bg-elite-primary text-white shadow-lg shadow-elite-primary/25'
                            : 'bg-white/[0.05] text-white/50 hover:text-white/80 hover:bg-white/[0.08]'
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
                    <div className="space-y-2">
                      {armas.map((a, i) => {
                        const esPrincipal = i === 0
                        return (
                          <div
                            key={a.arma}
                            className={`weapon-card px-3 py-2.5 ${
                              esPrincipal ? 'border-elite-gold/30' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                                esPrincipal ? 'weapon-placeholder border-elite-gold/20' : 'bg-white/[0.04]'
                              }`}>
                                <svg className="w-6 h-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                </svg>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`font-display font-bold text-xs ${
                                    esPrincipal ? 'text-elite-gold' : 'text-elite-ice'
                                  }`}>
                                    {nombreArma(a.arma)}
                                  </span>
                                  {esPrincipal && (
                                    <span className="text-[8px] font-bold uppercase tracking-wider text-elite-gold bg-elite-gold/10 px-1.5 py-0.5 rounded">
                                      Más letal
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="font-mono tabular-nums text-[11px] text-white/70">
                                    {a.kills.toLocaleString('es')} <span className="text-white/30 text-[9px]">kills</span>
                                  </span>
                                  {a.headshot > 0 && (
                                    <span className="font-mono tabular-nums text-[11px] text-elite-primary">
                                      {a.headshot.toFixed(1)}% <span className="text-white/30 text-[9px]">hs</span>
                                    </span>
                                  )}
                                  {a.puntuacion > 0 && (
                                    <span className="font-mono tabular-nums text-[11px] text-white/50">
                                      {a.puntuacion.toLocaleString('es')} <span className="text-white/30 text-[9px]">pts</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
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
