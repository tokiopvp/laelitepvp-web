'use client'

import { useEffect, useState } from 'react'
import { detectarGama, medirYAjustar, type Capacidades } from '@/lib/device'

/**
 * Gama del equipo, medida de verdad y compartida por toda la web.
 *
 * Arranca con la estimacion (nucleos, memoria, pantalla) y despues la sonda de
 * fotogramas la corrige si el equipo no da la talla. Cualquier componente que
 * llame a este hook se entera del cambio y se apaga solo.
 */
export function useGama(): Capacidades {
  // En el primer render devuelve la gama baja a proposito: el HTML se sirve
  // estatico y prometer efectos que aun no se pueden medir provoca un salton
  // feo en cuanto hidrata.
  const [gama, setGama] = useState<Capacidades>(
    () => ({ gama: 'bajo', particulas: 0, webgl: false, quieto: false })
  )

  useEffect(() => {
    const estimada = detectarGama()
    setGama(estimada)
    return medirYAjustar(estimada, setGama)
  }, [])

  return gama
}

/**
 * El halo de color del fondo.
 *
 * POR QUE NO USA `blur`
 * ---------------------
 * Antes esto era un `div` de 384x384 con `blur-3xl` (64 px de desenfoque) al
 * que se le animaba la ESCALA en bucle infinito. Ese es el peor caso posible
 * para una GPU: al cambiar la escala el navegador no puede reutilizar el
 * desenfoque ya calculado y tiene que rehacer el gaussiano entero en CADA
 * fotograma. En una grafica dedicada ni se nota; en una integrada se come los
 * fotogramas, que es justo por que la web iba fina en un equipo y a tirones en
 * el de al lado.
 *
 * Un circulo desenfocado es, en el fondo, un degradado radial. Asi que se pinta
 * como degradado: el navegador lo rasteriza UNA vez y despues moverlo o
 * atenuarlo le sale gratis, porque `transform` y `opacity` los resuelve el
 * compositor sin repintar nada.
 *
 * Se ve igual y cuesta una fraccion.
 */
export default function Resplandor({
  className = '',
  color = '#e11d3c',
  intensidad = 0.18,
  animado = true,
}: {
  /** Posicion y tamaño, en clases de Tailwind. */
  className?: string
  color?: string
  /** Opacidad maxima del halo (0-1). */
  intensidad?: number
  animado?: boolean
}) {
  const { gama, quieto } = useGama()

  // En gama baja o con "menos movimiento" el halo se queda quieto. Sigue
  // estando, sigue dando color: lo unico que se pierde es el latido.
  const mover = animado && !quieto && gama !== 'bajo'

  return (
    <div
      aria-hidden
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        background: `radial-gradient(closest-side, ${color} 0%, transparent 100%)`,
        opacity: intensidad,
        // `translateZ(0)` lo sube a su propia capa: asi la animacion no obliga
        // a repintar lo que tiene detras.
        transform: 'translateZ(0)',
        animation: mover ? 'elite-latido 8s ease-in-out infinite' : undefined,
        willChange: mover ? 'transform, opacity' : undefined,
      }}
    />
  )
}
