/**
 * Configuracion de AdSense.
 *
 * Los dos identificadores NO son secretos: aparecen en el codigo fuente de
 * cualquier pagina con anuncios, asi que van aqui y no en variables de
 * entorno. Lo que si es secreto es el acceso a tu cuenta, y eso no toca nada
 * de este archivo.
 *
 * COMO CONSEGUIRLOS
 * -----------------
 *   PUBLISHER  En adsense.google.com, arriba a la izquierda, tu ID de editor.
 *              Tiene la forma "ca-pub-" seguido de 16 digitos.
 *
 *   SLOT       Anuncios > Por unidad de anuncio > Anuncios in-feed.
 *              Crea uno, elige el estilo que mas se parezca a las tarjetas de
 *              noticias, y copia el "data-ad-slot": son 10 digitos.
 *
 * Mientras esten vacios NO se carga nada de Google: ni el script, ni cookies,
 * ni peticiones. La web funciona igual y no se ve ningun hueco.
 */

export const ADSENSE_PUBLISHER = ''   // p.ej. 'ca-pub-1234567890123456'
export const ADSENSE_SLOT_FEED = ''   // p.ej. '1234567890'

/** True cuando hay configuracion suficiente para pedir anuncios. */
export function adsenseActivo(): boolean {
  return /^ca-pub-\d{10,}$/.test(ADSENSE_PUBLISHER) && /^\d{6,}$/.test(ADSENSE_SLOT_FEED)
}

/**
 * Cada cuantas noticias se intercala un anuncio.
 *
 * Uno cada seis es deliberado. AdSense penaliza las paginas donde el anuncio
 * pesa mas que el contenido, y ademas la gente deja de volver a un sitio que
 * se siente lleno de publicidad. Con 24 noticias salen tres anuncios: se ven,
 * se pagan, y la pagina sigue siendo una pagina de noticias.
 */
export const CADA_CUANTAS_NOTICIAS = 6
