'use client'

import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

export default function WeaponParallax() {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 40, damping: 18 })
  const sy = useSpring(my, { stiffness: 40, damping: 18 })

  const rotate = useTransform(sx, [-0.5, 0.5], [-14, 14])
  const tiltX = useTransform(sy, [-0.5, 0.5], [10, -10])
  const x = useTransform(sx, [-0.5, 0.5], [-40, 40])
  const y = useTransform(sy, [-0.5, 0.5], [-24, 24])
  const glowX = useTransform(sx, [-0.5, 0.5], ['0%', '100%'])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5)
      my.set(e.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [mx, my])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden -z-0">
      {/* Halo que sigue el cursor */}
      <motion.div
        className="absolute w-[480px] h-[480px] rounded-full blur-[120px] opacity-40"
        style={{
          left: glowX,
          top: '30%',
          background: 'radial-gradient(circle, #e11d3c 0%, #ff4d68 55%, transparent 72%)',
        }}
      />

      {/* Arma (silueta de rifle) que reacciona al mouse */}
      <motion.div
        className="absolute right-[-6%] top-[18%] opacity-80 hidden lg:block"
        style={{ x, y, rotate, rotateX: tiltX }}
      >
        <svg width="520" height="220" viewBox="0 0 520 220" fill="none">
          <defs>
            <linearGradient id="gun" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e11d3c" />
              <stop offset="100%" stopColor="#e8b33c" />
            </linearGradient>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g stroke="url(#gun)" strokeWidth="3" filter="url(#glow)" strokeLinejoin="round" fill="rgba(225,29,60,0.06)">
            {/* cañón */}
            <rect x="330" y="86" width="160" height="16" rx="4" />
            {/* boca */}
            <rect x="486" y="82" width="14" height="24" rx="3" />
            {/* cuerpo / receiver */}
            <rect x="200" y="80" width="140" height="30" rx="5" />
            {/* culata */}
            <path d="M40 96 L200 96 L200 112 L96 132 L40 126 Z" />
            {/* empuñadura */}
            <rect x="210" y="108" width="20" height="46" rx="5" transform="rotate(14 220 131)" />
            {/* cargador */}
            <rect x="236" y="108" width="30" height="56" rx="5" transform="rotate(-10 251 136)" />
            {/* mira */}
            <rect x="280" y="58" width="12" height="24" rx="2" />
            <rect x="360" y="62" width="10" height="20" rx="2" />
          </g>
          {/* balas flotantes */}
          <g fill="url(#gun)">
            <motion.rect
              x="150" y="40" width="8" height="20" rx="3"
              animate={{ y: [40, 20, 40], opacity: [1, 0.4, 1] }}
              transition={{ duration: 2.4, repeat: Infinity }}
            />
            <motion.rect
              x="120" y="70" width="8" height="20" rx="3"
              animate={{ y: [70, 48, 70], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.6 }}
            />
            <motion.rect
              x="90" y="54" width="8" height="20" rx="3"
              animate={{ y: [54, 30, 54], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, delay: 1.1 }}
            />
          </g>
        </svg>
      </motion.div>
    </div>
  )
}
