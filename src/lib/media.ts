/**
 * Las fotos también por nuestro dominio.
 *
 * EL AGUJERO QUE QUEDABA
 * ----------------------
 * Al pasar las consultas por el proxy, la web dejó de tocar `supabase.co`...
 * salvo en las imágenes. Avatares y emblemas se guardan en la base como
 * direcciones completas -`https://<ref>.supabase.co/storage/...`- porque las
 * escribe así el sync, y un `<img src>` no pasa por el cliente de Supabase: va
 * directo.
 *
 * Resultado medido en la página de miembros: 2 peticiones por el proxy y 16 a
 * supabase.co. Los jugadores cuya red no resuelve ese dominio habrían visto la
 * web entera funcionando pero sin una sola foto, que es un fallo más raro de
 * diagnosticar que el original.
 *
 * POR QUE AQUI Y NO EN LA BASE
 * ----------------------------
 * Se podría hacer que el sync guardase la ruta ya cambiada, pero entonces el
 * dato quedaría atado al proxy: si algún día se quita, habría que reescribir
 * todas las filas. Cambiándolo al leer, la base sigue guardando la dirección
 * de verdad y esto es una capa que se puede quitar en una línea.
 */

/** Dominio de Supabase compilado en la web. Puede venir ya como proxy. */
const CONFIG = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

/**
 * Manda una URL de Storage por el mismo camino que el resto.
 *
 * Solo toca las que apuntan a `supabase.co`. Una ruta relativa, una imagen de
 * otro sitio o un valor vacío salen tal cual: esto no debe decidir nada más
 * que el dominio.
 */
export function media(url: string | null | undefined): string | null {
  if (!url) return null
  if (!/^https?:\/\/[a-z0-9]+\.supabase\.co\//i.test(url)) return url
  // Si la web ya va por el proxy, se reencamina; si no, se deja como está para
  // que quitar el proxy no rompa las fotos.
  if (!CONFIG.includes('/sb')) return url
  try {
    return CONFIG.replace(/\/+$/, '') + new URL(url).pathname + new URL(url).search
  } catch {
    return url
  }
}

/** Campos que guardan una imagen. Si aparece otro, se añade aquí y ya. */
const CAMPOS = [
  'avatar_url',
  'emblema_br_url',
  'emblema_cs_url',
  'outfit_image_url',
  'imagen_url',
] as const

/**
 * Devuelve la fila con sus imágenes reencaminadas.
 *
 * Copia en vez de modificar: los objetos que vienen de Supabase se reutilizan
 * en caché de React y tocarlos por dentro provoca fallos que aparecen dos
 * pantallas más allá.
 */
export function conMedia<T extends Record<string, unknown>>(fila: T): T {
  let copia: T | null = null
  for (const c of CAMPOS) {
    const v = fila[c]
    if (typeof v === 'string' && v) {
      const nuevo = media(v)
      if (nuevo !== v) {
        if (!copia) copia = { ...fila }
        ;(copia as Record<string, unknown>)[c] = nuevo
      }
    }
  }
  return copia ?? fila
}

export function conMediaLista<T extends Record<string, unknown>>(filas: T[]): T[] {
  return filas.map(conMedia)
}
