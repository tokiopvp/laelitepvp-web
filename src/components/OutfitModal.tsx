'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Member } from '@/lib/types'
import { RankEmblem } from '@/components/RankEmblem'

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
          <motion.div
            initial={{ scale: 0.94, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="card relative w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col sm:flex-row"
          >
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-black/40 border border-white/10 hover:border-elite-primary/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* El personaje */}
            <div className="relative flex-1 min-h-[280px] sm:min-h-[520px] flex items-end justify-center overflow-hidden">
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
                  className="relative max-h-[520px] w-auto object-contain drop-shadow-2xl"
                />
              ) : (
                <p className="relative text-white/40 text-sm p-8 text-center">
                  El bot todavía no ha fotografiado a este jugador.
                  <br />
                  Aparecerá en cuanto pase por su perfil.
                </p>
              )}
            </div>

            {/* Su ficha */}
            <div className="sm:w-60 shrink-0 p-5 sm:border-l border-white/[0.07] flex flex-col gap-4">
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
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
