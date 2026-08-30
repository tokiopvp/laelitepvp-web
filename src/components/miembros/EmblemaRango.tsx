'use client'

/**
 * El rango del jugador, con SU emblema de verdad.
 *
 * POR QUE NO SIRVE EL CAMPO `rank`
 * --------------------------------
 * Free Fire escribe "EMBLEMA HEROICO" debajo del rango en la tarjeta de TODOS
 * los jugadores: es una insignia fija, no el tier. El bot lo leia y guardaba
 * "Heroic" para los 44 miembros, asi que la web pintaba el mismo distintivo
 * -incluido a quien tiene el emblema rojo de Maestro-. Un dato que vale igual
 * para todo el mundo no informa de nada, y encima da la sensacion de estar
 * inventado.
 *
 * QUE SE ENSEÑA EN SU LUGAR, POR ORDEN
 * ------------------------------------
 *  1. LA IMAGEN del emblema, recortada del propio perfil por el bot. Es la
 *     verdad absoluta: trae el color, las estrellas, los puntos y la temporada
 *     tal cual salen en el juego.
 *  2. LOS PUNTOS de la temporada. Es un numero real, comparable y ordenable,
 *     que el bot lee de la tarjeta. Se enseña como una placa de juego.
 *  3. Nada. Antes de mentir, se dice "sin rango".
 */

interface Props {
  /** URL del recorte real. Si viene, manda sobre todo lo demas. */
  imagen?: string | null
  /** Puntos de la temporada de Battle Royale (dato real del juego). */
  puntos?: number | null
  /** Temporada, tipo "S52". */
  temporada?: string | null
  size?: number
  className?: string
  /** Ver la nota de IconoJugador: las primeras tarjetas cargan sin esperar. */
  prioritaria?: boolean
}

export default function EmblemaRango({
  imagen,
  puntos,
  temporada,
  size = 64,
  className,
  prioritaria = false,
}: Props) {
  if (imagen) {
    return (
      <div
        className={`${className ?? ''} flex flex-col items-center gap-1`}
        title={
          puntos
            ? `${Math.round(puntos).toLocaleString('es')} puntos${temporada ? ` · ${temporada}` : ''}`
            : 'Rango en el juego'
        }
      >
        {/* MEDALLA. El recorte viene rectangular y con el fondo del panel del
            juego pegado: encima de la tarjeta se veia como una pegatina con los
            cantos duros. Dentro de un circulo, con la imagen ampliada para que
            el emblema llene el hueco y un borde difuminado alrededor, se lee
            como una medalla en relieve y el recorte deja de notarse. */}
        <div
          className="relative rounded-full overflow-hidden"
          style={{
            width: size,
            height: size,
            background: 'radial-gradient(circle at 50% 35%, #16222c 0%, #070d13 100%)',
            // El relieve son tres capas: aro exterior con halo, sombra interior
            // arriba (hunde el borde) y luz interior abajo (lo levanta).
            boxShadow: [
              '0 0 0 1px rgba(91,157,255,0.35)',
              '0 0 14px 2px rgba(91,157,255,0.28)',
              'inset 0 3px 6px rgba(0,0,0,0.75)',
              'inset 0 -2px 5px rgba(255,255,255,0.10)',
            ].join(', '),
          }}
        >
          <img
            src={imagen}
            alt="Rango del jugador"
            loading={prioritaria ? 'eager' : 'lazy'}
            decoding={prioritaria ? 'sync' : 'async'}
            className="absolute object-cover"
            style={{
              // ENCUADRE MEDIDO, no estimado. Se analizaron cuatro recortes de
              // rangos distintos y los cuatro dan lo mismo: la imagen es
              // 232x130 y el emblema ocupa x=[65,165], y=[0,60], con su centro
              // en (116,30). Debajo van los puntos y la temporada, que aqui
              // sobran porque ya se enseñan como texto.
              //
              // De ahi salen estos numeros: la imagen se dibuja al 240% de
              // ancho y se corre hasta dejar ese centro en el centro del
              // circulo. Ajustandolo "a ojo" se colaba el numero dentro de la
              // medalla y el emblema quedaba cortado.
              width: '240%',
              height: '135%',
              left: '-70%',
              top: '19%',
              // OBLIGATORIO. El preflight de Tailwind trae
              // `img { max-width: 100% }`, que recortaba este 240% a 100% del
              // circulo: la imagen salia a tamaño 1:1 y el emblema quedaba
              // fuera de cuadro, con solo una esquina asomando.
              maxWidth: 'none',
            }}
          />
          {/* Brillo de chapa arriba. */}
          <div
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{
              background:
                'radial-gradient(120% 90% at 50% -20%, rgba(255,255,255,0.22), transparent 55%)',
            }}
          />
          {/* Borde borroso: funde el canto del recorte con la medalla. */}
          <div
            className="absolute inset-0 pointer-events-none rounded-full"
            style={{ boxShadow: 'inset 0 0 10px 4px rgba(7,13,19,0.85)' }}
          />
        </div>

        {puntos ? (
          <span className="font-mono text-[10px] leading-none tabular-nums text-elite-primary/90">
            {Math.round(puntos).toLocaleString('es')}
          </span>
        ) : null}
      </div>
    )
  }

  if (puntos && puntos > 0) {
    return (
      <div
        className={`${className ?? ''} ff-cut-sm px-2.5 py-1.5 text-right border`}
        style={{
          minWidth: size,
          borderColor: 'rgba(91, 157, 255, 0.35)',
          background:
            'linear-gradient(160deg, rgba(91,157,255,0.14), rgba(4,7,12,0.85))',
        }}
        title="Puntos de la temporada actual de Battle Royale"
      >
        <p className="font-display font-bold text-base leading-none tabular-nums neon-celeste">
          {Math.round(puntos).toLocaleString('es')}
        </p>
        <p className="text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
          {temporada ? `pts ${temporada}` : 'pts BR'}
        </p>
      </div>
    )
  }

  return (
    <div
      className={`${className ?? ''} text-[9px] uppercase tracking-widest text-white/25 border border-white/10 px-2 py-1 ff-cut-sm self-start`}
      title="El bot todavía no ha leído el rango de este jugador"
    >
      sin rango
    </div>
  )
}
