'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import type { Member } from '@/lib/types'
import { detectarGama } from '@/lib/device'

/**
 * El personaje del jugador top, de fondo en la portada.
 *
 * Material REAL del juego, recortado por el bot del perfil de esa persona: es
 * la forma honesta de que la web se sienta parte de Free Fire sin pegar
 * capturas de menus ni imagenes de terceros.
 *
 * Va detras del contenido, muy tenue y con parallax lento. Si nadie tiene
 * outfit todavia, no se dibuja nada: un hueco vacio se nota menos que una
 * silueta a medias.
 */
export default function OutfitAmbiente({ members }: { members: Member[] }) {
  const [gama, setGama] = useState<'alto' | 'medio' | 'bajo' | 'ahorro'>('bajo')
  useEffect(() => setGama(detectarGama().gama), [])

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const x = useSpring(useTransform(mx, [-0.5, 0.5], [24, -24]), { stiffness: 30, damping: 20 })
  const y = useSpring(useTransform(my, [-0.5, 0.5], [14, -14]), { stiffness: 30, damping: 20 })

  useEffect(() => {
    if (gama === 'bajo' || gama === 'ahorro') return
    const mover = (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5)
      my.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('mousemove', mover)
    return () => window.removeEventListener('mousemove', mover)
  }, [gama, mx, my])

  // El que mas kills tiene y ademas ya tiene foto.
  const estrella = useMemo(
    () =>
      members
        .filter((m) => m.outfit_image_url)
        .sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0))[0] ?? null,
    [members]
  )

  // En gama baja no se carga una imagen grande solo para decorar.
  if (!estrella?.outfit_image_url || gama === 'bajo' || gama === 'ahorro') return null

  return (
    <div
      className="absolute inset-y-0 right-0 w-[46%] pointer-events-none overflow-hidden hidden lg:block"
      aria-hidden
    >
      <motion.img
        src={estrella.outfit_image_url}
        alt=""
        style={{ x, y }}
        initial={{ opacity: 0, scale: 1.06 }}
        animate={{ opacity: 0.22, scale: 1 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
        className="absolute bottom-0 right-[-4%] h-[92%] w-auto object-contain"
      />
      {/* Degradados que funden al personaje con el fondo por los cuatro lados:
          sin esto se ve un recorte pegado, no una atmosfera. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, #08080a 0%, rgba(8,8,10,0.6) 28%, transparent 62%),' +
            'linear-gradient(0deg, #08080a 2%, transparent 34%)',
        }}
      />
    </div>
  )
}
