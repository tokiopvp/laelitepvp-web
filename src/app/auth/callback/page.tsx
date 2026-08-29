'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'

/**
 * Vuelta de Discord: se canjea el código por una sesión.
 *
 * POR QUE ESTA PAGINA SE COLGABA
 * ------------------------------
 * La versión anterior hacía `await exchangeCodeForSession(code)` dentro de una
 * función async sin `try/catch`. Si esa llamada LANZA -y lanza más de lo que
 * parece: red que se corta al cambiar de wifi a datos, `localStorage` bloqueado
 * en modo privado de iOS, respuesta inválida- la promesa quedaba rechazada sin
 * que nadie la recogiera, y la pantalla se quedaba en "Autenticando con
 * Discord…" PARA SIEMPRE. Sin mensaje, sin botón, sin salida.
 *
 * Ahora, pase lo que pase, esto termina en uno de tres sitios: dentro, en el
 * inicio, o en una pantalla que explica qué pasó y deja reintentar.
 *
 * LOS CASOS QUE HAY QUE CUBRIR
 * ----------------------------
 *   · Discord devuelve un error (el usuario canceló) -> hay que decirlo.
 *   · El código YA se canjeó (recargar, volver atrás, doble pestaña). Un código
 *     PKCE vale UNA vez, así que el segundo intento falla... pero la sesión ya
 *     existe. Antes esto echaba a alguien que en realidad estaba dentro.
 *   · Falta el verificador (se empezó a entrar en otro navegador, típico cuando
 *     Discord abre su navegador interno y devuelve al de fuera).
 *   · Algo tarda demasiado -> se corta y se ofrece reintentar, en vez de dejar
 *     la rueda girando.
 */

const ESPERA_MAX_MS = 15_000

/**
 * Errores de Supabase traducidos a algo que se pueda ACCIONAR.
 *
 * El que veia la gente era "Error getting user email from external provider":
 * en inglés, técnico, y sin decir qué hacer. Quien lo lee no sabe si el fallo
 * es suyo, del clan o de Discord, así que abandona.
 *
 * Cada entrada dice qué pasó Y el paso siguiente. Lo demás se muestra tal cual:
 * inventar un mensaje bonito para un fallo que no conocemos solo sirve para que
 * nadie pueda diagnosticarlo después.
 */
const TRADUCCIONES: { patron: RegExp; texto: string }[] = [
  {
    patron: /code verifier|pkce/i,
    texto:
      'Se perdió el hilo del acceso. Suele pasar si empezaste a entrar en otro ' +
      'navegador, o si se limpiaron los datos del sitio a mitad. Vuelve a ' +
      'pulsar el botón de entrar: a la segunda funciona.',
  },
  {
    patron: /email/i,
    texto:
      'Discord no nos dio tu correo. Suele ser porque lo tienes sin verificar: ' +
      'abre Discord → Ajustes de usuario → Mi cuenta y confirma tu email. ' +
      'Luego vuelve a intentarlo.',
  },
  {
    patron: /access_denied|cancel/i,
    texto: 'Cancelaste el inicio de sesión.',
  },
  {
    patron: /expired|invalid.*(code|grant)/i,
    texto:
      'El enlace de acceso caducó. Empieza de nuevo desde el botón de entrar; ' +
      'no reutilices un enlace viejo.',
  },
  {
    patron: /network|fetch|timeout/i,
    texto: 'Se cortó la conexión. Comprueba tu internet e inténtalo otra vez.',
  },
]

function traducir(mensaje: string): string {
  for (const t of TRADUCCIONES) if (t.patron.test(mensaje)) return t.texto
  return mensaje
}

/**
 * Espera a que exista sesión, por evento y por sondeo.
 *
 * Los dos caminos hacen falta: el evento cubre el caso normal, y el sondeo
 * cubre el canje que terminó antes de montar el componente —ahí el evento ya
 * pasó y esperarlo sería esperar para siempre.
 */
async function esperarSesion(
  sb: NonNullable<ReturnType<typeof supabaseBrowser>>,
  msMax = 12_000
): Promise<boolean> {
  const { data: ya } = await sb.auth.getSession()
  if (ya.session) return true

  return new Promise<boolean>((resolve) => {
    let resuelto = false
    const acabar = (v: boolean) => {
      if (resuelto) return
      resuelto = true
      clearInterval(sondeo)
      clearTimeout(tope)
      sub.subscription.unsubscribe()
      resolve(v)
    }

    const { data: sub } = sb.auth.onAuthStateChange((_e, sesion) => {
      if (sesion) acabar(true)
    })
    const sondeo = setInterval(async () => {
      const { data } = await sb.auth.getSession()
      if (data.session) acabar(true)
    }, 400)
    const tope = setTimeout(() => acabar(false), msMax)
  })
}

function CallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [fallo, setFallo] = useState<string | null>(null)

  useEffect(() => {
    const sb = supabaseBrowser()
    if (!sb) {
      setFallo('No se pudo conectar con el servidor.')
      return
    }

    /**
     * Reintento automático, UNA sola vez.
     *
     * Cuando falta el verificador no hay nada que recuperar: ese código ya no
     * se puede canjear. Pero volver a empezar el login desde el mismo navegador
     * funciona casi siempre, así que llevar a alguien a un callejón sin salida
     * y pedirle que pulse un botón es un paso de más — y un paso de más, en un
     * móvil, es gente que se va.
     *
     * El pestillo en `sessionStorage` es imprescindible: sin él, un fallo
     * persistente (almacenamiento bloqueado, modo privado) reintentaría en
     * bucle infinito entre Discord y la web.
     */
    const CLAVE_REINTENTO = 'elite_login_reintento'
    const reintentar = () => {
      try {
        if (sessionStorage.getItem(CLAVE_REINTENTO)) return false
        sessionStorage.setItem(CLAVE_REINTENTO, '1')
      } catch {
        return false
      }
      sb.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          scopes: 'identify email',
          redirectTo: 'https://www.laelitepvp.com/auth/callback',
        },
      })
      return true
    }

    let vivo = true
    // Red de seguridad: si nada resuelve en quince segundos, se muestra la
    // salida. Es el cinturón que impide volver a colgarse pase lo que pase.
    const corte = setTimeout(() => {
      if (vivo) setFallo('La conexión está tardando demasiado.')
    }, ESPERA_MAX_MS)

    const terminar = (destino: string) => {
      if (!vivo) return
      clearTimeout(corte)
      try {
        sessionStorage.removeItem('elite_login_reintento')
      } catch {
        /* sin almacenamiento: nada que limpiar */
      }
      router.replace(destino)
    }

    const rendirse = (motivo: string) => {
      if (!vivo) return
      clearTimeout(corte)
      setFallo(motivo)
    }

    ;(async () => {
      try {
        // 1. Discord puede volver con un error explícito (normalmente porque
        //    la persona pulsó "Cancelar").
        const errUrl = params.get('error_description') || params.get('error')
        if (errUrl) return rendirse(traducir(decodeURIComponent(errUrl)))

        // 2. Se espera a que la LIBRERIA canjee el código.
        //
        // Con `detectSessionInUrl: true`, supabase-js detecta el `?code=` de la
        // URL al arrancar y hace el canje solo, emparejando el estado con su
        // verificador. Aquí no se canjea nada: solo se espera el resultado.
        //
        // Se escucha el evento Y se sondea, porque el canje puede haber
        // terminado ANTES de que este componente llegue a montarse -pasa cuando
        // la respuesta es rápida- y entonces el evento ya no llega.
        const sesion = await esperarSesion(sb)
        if (!sesion) {
          // Un reintento en silencio antes de rendirse: si el flujo se perdió,
          // empezarlo de nuevo desde este navegador funciona casi siempre.
          if (params.get('code') && reintentar()) return
          return rendirse(
            'No pudimos completar el acceso. Vuelve a pulsar el botón de entrar ' +
              'desde este mismo navegador.'
          )
        }

        terminar(await destinoSegun(sb))
      } catch (e) {
        rendirse(
          'Se cortó la conexión mientras entrábamos. Inténtalo otra vez.' +
            (process.env.NODE_ENV === 'development' ? ` (${String(e)})` : '')
        )
      }
    })()

    return () => {
      vivo = false
      clearTimeout(corte)
    }
  }, [params, router])

  if (fallo) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="card-glow p-8 text-center max-w-sm">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h1 className="font-display font-bold text-xl mb-2">No pudimos entrar</h1>
          <p className="text-white/60 text-sm mb-6">{fallo}</p>
          <div className="space-y-2">
            <Link href="/mi" className="btn-primary w-full justify-center inline-flex">
              Volver a intentarlo
            </Link>
            <Link
              href="/"
              className="block text-white/40 hover:text-white/70 text-sm transition-colors"
            >
              Ir al inicio
            </Link>
          </div>
          {/* Este consejo solo vale cuando el fallo es de sesión perdida. En
              un error de correo no verificado es ruido que despista: la persona
              probaría a cambiar de navegador y seguiría sin poder entrar. */}
          {!/correo|verificar|cancelaste/i.test(fallo) && (
            <p className="text-white/25 text-xs mt-5 leading-snug">
              Si se repite: abre <strong>www.laelitepvp.com</strong> en tu navegador normal —
              el navegador que abre Discord dentro de la app a veces no guarda la sesión.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-white/60 font-display text-lg gradient-text">Autenticando con Discord…</p>
    </div>
  )
}

/**
 * A dónde mandar a alguien que acaba de entrar.
 *
 * El staff va al panel y el resto a su perfil. Si la consulta del rol falla, se
 * va a `/mi`: quedarse fuera por no poder leer un rol sería absurdo cuando la
 * sesión ya es válida.
 */
async function destinoSegun(sb: NonNullable<ReturnType<typeof supabaseBrowser>>) {
  try {
    const { data: u } = await sb.auth.getUser()
    const uid = u.user?.id
    if (!uid) return '/mi'
    const { data } = await sb.from('profiles').select('role').eq('id', uid).maybeSingle()
    const rol = (data?.role as string) ?? null
    return rol && rol !== 'member' ? '/admin' : '/mi'
  } catch {
    return '/mi'
  }
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <CallbackInner />
    </Suspense>
  )
}
