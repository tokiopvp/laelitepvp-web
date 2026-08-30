/**
 * Aura electrica de los mandos del clan.
 *
 * QUE SE QUERIA Y POR QUE EL ANILLO NO VALIA
 * ------------------------------------------
 * El primer intento fue un anillo de luz girando por el borde. Se veia
 * ordenado, pero era un adorno: una luz encendida dando vueltas. Lo que se
 * pidio es otra cosa -corriente que APARECE y DESAPARECE, rayos saliendo del
 * personaje-, y eso no se consigue con nada que este siempre encendido.
 *
 * Lo que impresiona de un rayo es que no estaba y de pronto esta.
 *
 * COMO ESTA HECHO
 * ---------------
 * Rayos de verdad: polilineas quebradas dibujadas en SVG, no destellos
 * difuminados. La forma se calcula UNA vez al montar y ya no cambia; lo unico
 * que se anima es la opacidad de cada rayo, con su propio ritmo.
 *
 * Cada rayo tiene dos trazos superpuestos:
 *   - uno grueso y translucido en color  -> el resplandor
 *   - uno fino y casi blanco encima      -> el nucleo del arco
 * Esos dos trazos son todo el truco del aspecto "HD". Un rayo de un solo
 * grosor y un solo color se ve plano; con nucleo blanco parece que quema.
 *
 * POR QUE ESTO NO CUESTA NADA
 * ---------------------------
 * No hay `filter`, ni `blur`, ni sombras animadas, ni canvas, ni un solo
 * calculo por fotograma. Son unos pocos `path` estaticos a los que el
 * navegador solo les cambia la opacidad, y la opacidad la resuelve el
 * compositor: mover o atenuar algo YA pintado sale practicamente gratis. Lo
 * que hundia la maquina en versiones anteriores eran los desenfoques grandes,
 * que obligan a rasterizar de nuevo en cada fotograma.
 *
 * Ademas solo lo llevan tres o cuatro tarjetas de las cuarenta y tantas.
 *
 * LA INTENSIDAD
 * -------------
 * Un unico numero de 0 a 1 gobierna cuantos rayos hay, cuantas chispas, su
 * brillo y cada cuanto saltan. Lider 1, interino 0.4, decano 0.2. Es el mismo
 * efecto a distinta potencia a proposito: si cada rango tuviera su propia
 * animacion se leerian como tres adornos sin relacion, y asi la jerarquia se
 * entiende sin leer ninguna etiqueta.
 */

'use client'

import { useMemo } from 'react'

/** Un rayo: recorrido quebrado que sale del borde hacia fuera. */
function trazarRayo(
  x0: number, y0: number, angulo: number, largo: number, tramos: number,
  azar: () => number,
): string {
  const puntos: string[] = [`${x0.toFixed(1)},${y0.toFixed(1)}`]
  let x = x0
  let y = y0
  const paso = largo / tramos
  for (let i = 0; i < tramos; i++) {
    // Cada tramo se desvia del angulo base. Sin desviacion sale una recta;
    // con demasiada sale un garabato. +-38 grados es donde se lee como rayo.
    const a = angulo + (azar() - 0.5) * 1.3
    x += Math.cos(a) * paso
    y += Math.sin(a) * paso
    puntos.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return 'M' + puntos.join(' L')
}

/**
 * Generador con semilla.
 *
 * Los rayos tienen que ser IGUALES en el servidor y en el navegador: con
 * Math.random el HTML que llega y el que React vuelve a pintar no coinciden y
 * Next avisa de desajuste de hidratacion. Con semilla, cada tarjeta tiene su
 * propia forma -no se repiten entre jugadores- y ademas es reproducible.
 */
function azarConSemilla(semilla: number) {
  let s = semilla >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export default function AuraElectrica({
  intensidad,
  semilla = 1,
}: {
  /** 0 a 1. Lider 1, interino 0.4, decano 0.2. */
  intensidad: number
  /** Para que dos tarjetas no tengan los rayos calcados. */
  semilla?: number
}) {
  const { rayos, chispas } = useMemo(() => {
    const azar = azarConSemilla(semilla * 2654435761)
    // De 3 a 9 rayos segun el rango. El decano tiene los justos para que se
    // note que algo pasa; el lider, los que hacen falta para que parezca que
    // la tarjeta esta electrificada.
    const cuantos = Math.max(3, Math.round(3 + intensidad * 6))

    const rayos = Array.from({ length: cuantos }, (_, i) => {
      // Repartidos por el perimetro, no agrupados en una esquina.
      const t = (i + azar() * 0.6) / cuantos
      const lado = Math.floor(t * 4)
      const p = (t * 4) % 1
      // Coordenadas sobre un lienzo de 100x100 que luego se estira a la
      // tarjeta con preserveAspectRatio="none".
      const [x, y, ang] =
        lado === 0 ? [p * 100, 0, -Math.PI / 2] :
        lado === 1 ? [100, p * 100, 0] :
        lado === 2 ? [100 - p * 100, 100, Math.PI / 2] :
                     [0, 100 - p * 100, Math.PI]
      return {
        d: trazarRayo(x, y, ang, 9 + azar() * 13, 4 + Math.floor(azar() * 3), azar),
        // Cada rayo con su propio ritmo y su propio retraso: si saltaran a la
        // vez se leeria como un parpadeo de la pagina, no como electricidad.
        dur: (1.6 + azar() * 2.6).toFixed(2),
        retraso: (azar() * 4).toFixed(2),
      }
    })

    // Chispas sueltas flotando alrededor. Son las "estrellas" del aura.
    const nChispas = Math.round(intensidad * 10)
    const chispas = Array.from({ length: nChispas }, () => ({
      x: (azar() * 100).toFixed(1),
      y: (azar() * 100).toFixed(1),
      r: (0.5 + azar() * 0.9).toFixed(2),
      dur: (1.4 + azar() * 2.4).toFixed(2),
      retraso: (azar() * 3.5).toFixed(2),
    }))
    return { rayos, chispas }
  }, [intensidad, semilla])

  return (
    <svg
      className="aura-electrica"
      viewBox="0 0 100 100"
      // La tarjeta no es cuadrada: sin esto los rayos de los lados cortos
      // saldrian aplastados y los de los largos, estirados.
      preserveAspectRatio="none"
      aria-hidden
      style={{ opacity: 0.35 + intensidad * 0.65 }}
    >
      {rayos.map((r, i) => (
        <g key={i} style={{ animationDuration: `${r.dur}s`, animationDelay: `${r.retraso}s` }}>
          {/* Resplandor: grueso, translucido, en color. */}
          <path d={r.d} className="rayo-halo" />
          {/* Nucleo: fino y casi blanco. Es lo que hace que parezca que quema. */}
          <path d={r.d} className="rayo-nucleo" />
        </g>
      ))}
      {chispas.map((c, i) => (
        <circle
          key={`c${i}`}
          cx={c.x}
          cy={c.y}
          r={c.r}
          className="chispa"
          style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.retraso}s` }}
        />
      ))}
    </svg>
  )
}
