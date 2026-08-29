import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase del navegador.
 *
 * POR QUE `localStorage` Y NO COOKIES
 * -----------------------------------
 * Antes se usaba `createBrowserClient` de `@supabase/ssr`, que guarda la sesión
 * en cookies. Eso tiene sentido cuando hay un servidor que las lee para
 * renderizar; aquí NO lo hay: el sitio es un export estático y no existe un solo
 * `createServerClient` en todo el proyecto. Así que las cookies no aportaban
 * nada y sí costaban:
 *
 *   · Safari y iOS recortan a **7 días** cualquier cookie escrita desde
 *     JavaScript (ITP). Un jugador de iPhone tenía que volver a entrar cada
 *     semana, hiciera lo que hiciera.
 *   · En Android se borran junto con "datos del sitio", que la gente limpia sin
 *     pensar cuando el móvil va lento.
 *
 * `localStorage` no sufre ese recorte: la sesión dura hasta que alguien cierra
 * sesión a propósito o limpia el navegador.
 */

const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const CLAVE_SB = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Referencia del proyecto: `https://xxxx.supabase.co` → `xxxx`. */
function refProyecto(url: string): string {
  try {
    return new URL(url).hostname.split('.')[0]
  } catch {
    return ''
  }
}

/**
 * Pasa la sesión de las cookies viejas a `localStorage`.
 *
 * Sin esto, el cambio de almacenamiento obligaría a TODOS los que ya estaban
 * dentro a iniciar sesión una vez más — justo lo contrario de lo que se busca.
 * Se ejecuta una sola vez: en cuanto la sesión está en `localStorage`, no
 * vuelve a mirar las cookies.
 *
 * `@supabase/ssr` guarda el valor como `base64-<json en base64>` y lo parte en
 * trozos (`.0`, `.1`) cuando no cabe en una cookie, así que hay que recomponerlo.
 */
function migrarDesdeCookies(clave: string): void {
  try {
    if (localStorage.getItem(clave)) return // Ya migrado.
    if (typeof document === 'undefined' || !document.cookie) return

    const trozos: Record<string, string> = {}
    for (const par of document.cookie.split(';')) {
      const i = par.indexOf('=')
      if (i < 0) continue
      const nombre = par.slice(0, i).trim()
      if (nombre === clave || nombre.startsWith(clave + '.')) {
        trozos[nombre] = decodeURIComponent(par.slice(i + 1))
      }
    }
    if (Object.keys(trozos).length === 0) return

    // Los trozos van numerados: hay que unirlos EN ORDEN, o el JSON sale roto.
    const crudo = Object.keys(trozos)
      .sort((a, b) => {
        const na = parseInt(a.split('.').pop() || '0', 10)
        const nb = parseInt(b.split('.').pop() || '0', 10)
        return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb)
      })
      .map((k) => trozos[k])
      .join('')

    const json = crudo.startsWith('base64-')
      ? decodeURIComponent(escape(atob(crudo.slice(7))))
      : crudo

    // Solo se acepta si de verdad es una sesión: escribir basura en la clave
    // dejaría al cliente sin poder iniciar sesión hasta limpiar el navegador.
    const sesion = JSON.parse(json)
    if (sesion && typeof sesion === 'object' && sesion.access_token) {
      localStorage.setItem(clave, JSON.stringify(sesion))
    }
  } catch {
    // Cookie ilegible, modo privado, almacenamiento bloqueado: se sigue sin
    // migrar. Lo peor que pasa es que esa persona entre una vez más.
  }
}

/**
 * Rescata el verificador PKCE de la cookie a `localStorage`.
 *
 * Es un valor corto y en texto plano (no va en base64 ni troceado como la
 * sesión), así que basta con copiarlo tal cual.
 */
function migrarVerificador(clave: string): void {
  try {
    if (localStorage.getItem(clave)) return
    for (const par of document.cookie.split(';')) {
      const i = par.indexOf('=')
      if (i < 0) continue
      if (par.slice(0, i).trim() === clave) {
        const v = decodeURIComponent(par.slice(i + 1))
        if (v) localStorage.setItem(clave, v)
        return
      }
    }
  } catch {
    // Almacenamiento bloqueado: se sigue sin migrar.
  }
}

// Desactiva el cache HTTP del navegador para todas las lecturas de Supabase.
// Sin esto, los polls (ej. cada 20s en /miembros) devuelven respuestas
// cacheadas y la UI parece "congelada" aunque los datos en BD estan frescos.
const noStoreFetch = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, cache: 'no-store' })

let cliente: SupabaseClient | null = null

export function supabaseBrowser(): SupabaseClient | null {
  if (!URL_SB || !CLAVE_SB) return null
  if (cliente) return cliente

  const clave = `sb-${refProyecto(URL_SB)}-auth-token`
  if (typeof window !== 'undefined') {
    migrarDesdeCookies(clave)
    // El VERIFICADOR del login en curso también hay que rescatarlo.
    //
    // Quien pulsó "entrar" antes de que este cambio se desplegara tiene su
    // verificador guardado en una cookie, y al volver de Discord el canje lo
    // busca en `localStorage`: no lo encuentra y el acceso muere con
    // "PKCE code verifier not found in storage". Es un login a medias que se
    // pierde por un detalle de almacenamiento.
    migrarVerificador(`${clave}-code-verifier`)
  }

  cliente = createClient(URL_SB, CLAVE_SB, {
    global: { fetch: noStoreFetch },
    auth: {
      // La sesión sobrevive a cerrar el navegador, apagar el móvil y volver
      // dentro de un mes.
      persistSession: true,
      // El token de acceso dura una hora; este renueva solo, sin que nadie note
      // nada. Mientras el de refresco valga, no hay que volver a entrar.
      autoRefreshToken: true,
      // El intercambio del código lo hace /auth/callback a mano. Dejarlo
      // también aquí provocaría que dos sitios intenten canjear el MISMO código
      // y el segundo falle, porque un código solo se puede usar una vez.
      detectSessionInUrl: false,
      flowType: 'pkce',
      storageKey: clave,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })
  return cliente
}
