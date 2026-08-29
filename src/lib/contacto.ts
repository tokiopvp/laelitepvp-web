/**
 * Datos de contacto y redes del clan.
 *
 * POR QUE ESTAN AQUI Y NO REPARTIDOS
 * ----------------------------------
 * Antes cada componente traia su propio enlace, y varios eran marcadores de
 * posicion que llegaron a produccion: el pie apuntaba a discord.gg a secas, a
 * youtube.com a secas, y publicaba un numero de WhatsApp inventado de Mexico.
 * Un visitante que tocaba cualquiera de esos se iba del sitio y no volvia.
 *
 * Con un solo archivo, cambiar un enlace es cambiar una linea y se actualiza en
 * todas partes. Nada de esto es secreto: son enlaces publicos pensados para que
 * la gente los use.
 */

/** Numero de soporte, en formato internacional. */
export const WHATSAPP = '+51 918145574'

/** Solo digitos, que es lo que acepta wa.me. */
export const WHATSAPP_DIGITOS = WHATSAPP.replace(/\D/g, '')

/** Enlace de WhatsApp, opcionalmente con un mensaje ya escrito. */
export function enlaceWhatsApp(mensaje?: string, numero?: string | null): string {
  // `numero` permite que el panel sustituya el de soporte sin tocar el codigo.
  const digitos = (numero ?? WHATSAPP).replace(/\D/g, '') || WHATSAPP_DIGITOS
  const base = `https://wa.me/${digitos}`
  return mensaje ? `${base}?text=${encodeURIComponent(mensaje)}` : base
}

export const DISCORD = 'https://discord.gg/mZfspFeJAH'
export const YOUTUBE = 'https://www.youtube.com/@Teamtokiopvp'
export const TIKTOK = 'https://www.tiktok.com/@tokiopvp'
export const EMAIL = 'contacto@laelitepvp.com'

/**
 * Redes que se muestran.
 *
 * No hay Instagram a proposito: el clan no tiene cuenta, y un icono que lleva a
 * un perfil vacio -o a instagram.com a secas- resta mas de lo que suma.
 */
export const REDES = [
  {
    label: 'Discord',
    href: DISCORD,
    // Los iconos van como path SVG en vez de libreria: son cuatro, no cambian
    // nunca, y asi no se carga un paquete entero por el pie de pagina.
    path: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.675 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.083.083 0 0 0 .031.057 19.9 19.9 0 0 0 5.992 4.065.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-.214.076.076 0 0 0 .041-.093 13.107 13.107 0 0 0-.844-1.785.077.077 0 0 1-.007-.128 10.2 10.2 0 0 1 .587-.947.077.077 0 0 1 .128-.007c2.123.64 4.35.963 6.638.963s4.515-.323 6.638-.963a.077.077 0 0 1 .128.007c.167.134.337.262.507.382a.077.077 0 0 1-.006.127 13.079 13.079 0 0 0-.844 1.785.076.076 0 0 0 .041.093 14.032 14.032 0 0 0 1.226.214.077.077 0 0 0 .084.028 19.839 19.839 0 0 0 5.992-4.065.081.081 0 0 0 .031-.057c.418-4.481-.426-9.017-3.556-13.66a.061.061 0 0 0-.031-.027zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z',
  },
  {
    label: 'YouTube',
    href: YOUTUBE,
    path: 'M23.498 6.186a3.167 3.167 0 0 0-2.112-2.235C20.237 3.596 12 3.596 12 3.596s-8.246 0-9.396.365a3.169 3.169 0 0 0-2.122 2.235C.34 7.534 0 9.452 0 12s.34 4.477.878 5.814a3.167 3.167 0 0 0 2.112 2.225c1.15.365 9.396.365 9.396.365s8.236 0 9.386-.365a3.155 3.155 0 0 0 2.112-2.225c.538-1.347.878-3.265.878-5.814s-.34-4.477-.878-5.823zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  {
    label: 'TikTok',
    href: TIKTOK,
    // Icono oficial completo. El que habia antes era un fragmento suelto que se
    // dibujaba como una figura irreconocible.
    path: 'M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z',
  },
] as const
