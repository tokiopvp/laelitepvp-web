'use client'

/**
 * El icono del jugador, recortado por el bot de su propio perfil de Free Fire.
 *
 * EL MARCO BLANCO SE QUITA EN EL BOT, NO AQUI
 * -------------------------------------------
 * Free Fire dibuja cada icono dentro de un cuadro con borde claro, y debajo
 * asoma la franja del banner. Al principio se tapaba ampliando la imagen con
 * CSS, pero eso es maquillaje: el archivo seguia sucio y cualquier otro sitio
 * que lo use (Discord, una miniatura, el panel) volvia a enseñar el borde.
 * Ahora el bot detecta el marco y lo recorta al guardar
 * (`escaner.perfil.quitar_marco`), asi que aqui llega limpio y cuadrado.
 *
 * SIN TRANSFORM NI RECORTES ANIDADOS
 * -----------------------------------
 * La primera version ampliaba la imagen con `transform: scale()` dentro de dos
 * `clip-path` anidados. Se cambio por tamaño + posicion y un solo recorte, que
 * hace exactamente lo mismo con menos capas de composicion.
 *
 * (Durante un rato pareció que ese anidamiento era la causa de que los iconos
 * salieran en NEGRO. No lo era: las imagenes estaban cargadas y sin recortar,
 * y lo que fallaba era la DECODIFICACION diferida -`loading=lazy` +
 * `decoding=async`- que las deja sin pintar hasta que algo las activa. Se
 * arregla en la pagina cargando con prioridad las primeras tarjetas, no aqui.)
 */

import { cn } from '@/lib/utils'

interface Props {
  src?: string | null
  nombre: string
  /** Lado de la caja en px. */
  size?: number
  /**
   * Margen de seguridad, en %. La imagen se dibuja un poco mas grande que su
   * caja para comerse cualquier pixel de borde que quede. Con 4 sobra: el
   * recorte ya viene limpio del bot.
   */
  margen?: number
  className?: string
  /** Color del filo, normalmente el del rango. */
  aura?: string
  /**
   * Para las tarjetas que se ven sin bajar. Carga y DECODIFICA la imagen ya,
   * en vez de dejarlo para cuando el navegador tenga tiempo: si no, el icono
   * se queda en negro hasta que el visitante hace scroll y la primera
   * impresion de la pagina es una rejilla de cuadros vacios.
   */
  prioritaria?: boolean
}

export default function IconoJugador({
  src,
  nombre,
  size = 64,
  margen = 4,
  className,
  aura = '#5b9dff',
  prioritaria = false,
}: Props) {
  // Sin `\p{L}` ni la bandera `u`: el tsconfig del proyecto apunta a una
  // version anterior a ES6 y ahi esa sintaxis no compila. Basta con quedarse
  // con letras y numeros ASCII, que es lo que se ve en un par de iniciales.
  const iniciales =
    (nombre || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '??'

  return (
    <div
      className={cn('relative shrink-0 overflow-hidden rounded-[7px]', className)}
      style={{
        width: size,
        height: size,
        // Filo de luz en vez de un `ring` completo: el anillo uniforme delata
        // que es una caja web; el filo se parece al panel del juego.
        background: `linear-gradient(150deg, ${aura}66, rgba(255,255,255,0.08) 45%, rgba(4,7,12,0.92))`,
        padding: 2,
      }}
    >
      <div className="relative w-full h-full overflow-hidden rounded-[5px] bg-elite-dark">
        {src ? (
          <img
            src={src}
            alt=""
            loading={prioritaria ? 'eager' : 'lazy'}
            decoding={prioritaria ? 'sync' : 'async'}
            fetchPriority={prioritaria ? 'high' : 'auto'}
            className="absolute object-cover"
            style={{
              width: `${100 + margen}%`,
              height: `${100 + margen}%`,
              left: `-${margen / 2}%`,
              top: `-${margen / 2}%`,
              // Sin esto el `max-width: 100%` del preflight de Tailwind se
              // come el margen de seguridad y la imagen queda justa al borde.
              maxWidth: 'none',
              // El personaje va ligeramente alto dentro del cuadro del juego;
              // centrarlo en el 45% deja la cara en el medio optico.
              objectPosition: '50% 45%',
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-display font-bold text-white/75"
            style={{ fontSize: size * 0.34 }}
          >
            {iniciales}
          </div>
        )}

        {/* Vineta MUY suave: funde el canto del recorte con el panel sin apagar
            la ilustracion. Muchos iconos del juego ya son oscuros de por si. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(125% 125% at 50% 42%, transparent 70%, rgba(4,7,12,0.28) 100%)',
          }}
        />
      </div>
    </div>
  )
}
