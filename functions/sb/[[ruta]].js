/**
 * Supabase servido desde laelitepvp.com.
 *
 * POR QUE EXISTE
 * --------------
 * Dos jugadores el mismo dia no pudieron usar la web: uno no podia ni iniciar
 * sesion -DNS_PROBE_FINISHED_NXDOMAIN al pulsar "Entrar con Discord"- y al otro
 * le salia el clan vacio, cero tareas y saldo cero. Los datos estaban intactos;
 * lo que fallaba era que SUS redes no resolvian `supabase.co`.
 *
 * No hay nada que arreglar en la base ni en el codigo de la web: el problema
 * esta entre el telefono del jugador y ese dominio concreto. Lo unico que lo
 * quita de en medio es dejar de depender de el.
 *
 * Con esto, el navegador habla SOLO con laelitepvp.com -que ya resuelve, o no
 * habria cargado la pagina- y Cloudflare reenvia a Supabase desde su red, que
 * no pasa por la operadora del jugador.
 *
 * NO ABRE NINGUNA PUERTA NUEVA
 * ----------------------------
 * Reenvia tal cual lo que manda el navegador, incluida su clave. Cualquiera
 * podia llamar a esos mismos endpoints en supabase.co con la misma clave
 * publica: quien decide que se puede leer y escribir siguen siendo las
 * politicas RLS, no este archivo. Aqui NO se añade la clave de servicio ni
 * ninguna otra credencial.
 *
 * EL ENREDO DEL LOGIN CON DISCORD
 * -------------------------------
 * El ida y vuelta de OAuth toca el dominio de Supabase DOS veces, y las dos
 * hay que desviarlas:
 *
 *   1. La web manda al navegador a `/sb/auth/v1/authorize`. Eso ya pasa por
 *      aqui. Supabase responde "vete a Discord", y en esa respuesta mete un
 *      `redirect_uri` que apunta a `<ref>.supabase.co/auth/v1/callback`.
 *      Si se deja, Discord devolveria al jugador a ese dominio y estariamos
 *      igual que antes. Se reescribe para que apunte aqui.
 *
 *   2. Discord devuelve al jugador a `/sb/auth/v1/callback`. Eso tambien pasa
 *      por aqui y se reenvia a Supabase, que termina el intercambio y responde
 *      con la vuelta a /auth/callback de la web.
 *
 * Para que el paso 1 funcione, en el portal de Discord tiene que estar dada de
 * alta la URL `https://www.laelitepvp.com/sb/auth/v1/callback` como redirect
 * valida. Sin eso, Discord rechaza la peticion con "invalid redirect_uri".
 */

/** Cabeceras que NO se reenvian: las pone Cloudflare y confunden al destino. */
const FUERA = new Set([
  'host',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-host',
  'x-forwarded-proto',
  'content-length',
])

/**
 * El origen real de Supabase.
 *
 * OJO CON EL BUCLE
 * ----------------
 * Al activar el proxy, `NEXT_PUBLIC_SUPABASE_URL` pasa a valer
 * `https://www.laelitepvp.com/sb`, que es ESTA MISMA funcion. Si se cayera a
 * esa variable, el proxy se llamaria a si mismo hasta agotar la peticion: la
 * web entera dejaria de responder y el motivo no se veria por ningun lado.
 *
 * Por eso manda `SUPABASE_URL`, que es de servidor y sigue apuntando al
 * dominio de verdad; y por eso, si lo que sale de aqui apunta a nuestro propio
 * dominio, se descarta en vez de usarse.
 */
function destino(env, propioOrigen) {
  const u = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  if (!u) return ''
  try {
    if (new URL(u).origin === propioOrigen) return ''
  } catch {
    return ''
  }
  return u
}

/**
 * Reescribe una URL de Supabase para que apunte a este proxy.
 *
 * Se usa en las redirecciones: si Supabase contesta "vete a
 * <ref>.supabase.co/algo", el navegador tendria que resolver ese dominio otra
 * vez y volveriamos al problema.
 */
function aProxy(url, origenSupabase, basePublica) {
  if (!url || !url.startsWith(origenSupabase)) return url
  return basePublica + '/sb' + url.slice(origenSupabase.length)
}

export async function onRequest({ request, env }) {
  const entrada = new URL(request.url)
  const base = entrada.origin

  const origen = destino(env, base)
  if (!origen) {
    // Mensaje explicito y no un 500 mudo: si esto salta, lo que falta es
    // `SUPABASE_URL` en Cloudflare apuntando al dominio real de Supabase.
    return new Response(
      'Proxy mal configurado: falta SUPABASE_URL con el dominio real de Supabase.',
      { status: 503, headers: { 'cache-control': 'no-store' } },
    )
  }

  // /sb/rest/v1/members  ->  https://<ref>.supabase.co/rest/v1/members
  const ruta = entrada.pathname.replace(/^\/sb/, '') || '/'
  const objetivo = origen + ruta + entrada.search

  const cabeceras = new Headers()
  for (const [k, v] of request.headers) {
    if (!FUERA.has(k.toLowerCase())) cabeceras.set(k, v)
  }

  // ── Realtime: es un WebSocket, no una peticion normal.
  //
  // Solo lo usa el panel de admin, pero si no se reenvia el "upgrade" la
  // conexion se queda colgada en vez de fallar rapido, que es peor.
  if ((request.headers.get('upgrade') || '').toLowerCase() === 'websocket') {
    const r = await fetch(objetivo, { headers: cabeceras, method: request.method })
    if (r.webSocket) {
      return new Response(null, { status: 101, webSocket: r.webSocket })
    }
    return new Response('No se pudo abrir el canal en vivo.', { status: 502 })
  }

  let respuesta
  try {
    respuesta = await fetch(objetivo, {
      method: request.method,
      headers: cabeceras,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      // Manual y no automatico A PROPOSITO: las redirecciones hay que verlas
      // para poder reescribirlas. Si Cloudflare las siguiera por su cuenta, el
      // navegador nunca veria el desvio y el login de Discord se romperia.
      redirect: 'manual',
    })
  } catch {
    return new Response('No pude hablar con el servidor de datos.', { status: 502 })
  }

  const salida = new Headers(respuesta.headers)

  // ── Redirecciones
  const destinoRedir = salida.get('location')
  if (destinoRedir) {
    let nueva = aProxy(destinoRedir, origen, base)

    // EL `redirect_uri` NO SE TOCA. Se intento y rompio el login entero.
    //
    // La idea era desviar tambien la vuelta de Discord, para que el navegador
    // no tuviera que resolver supabase.co en ningun momento. Discord aceptaba
    // el desvio y el jugador llegaba aqui con su codigo. Pero despues Supabase
    // canjea ese codigo hablando con Discord, y en ese canje manda SU propio
    // `redirect_uri` -el de supabase.co, que es el unico que conoce-.
    //
    // Discord exige que el `redirect_uri` del canje sea identico al de la
    // autorizacion. Al no coincidir, rechazaba el canje y Supabase devolvia
    // "Unable to exchange external code". Fallaba para TODOS, no solo para
    // quien tenia el problema de DNS.
    //
    // No hay forma de arreglarlo desde aqui: quien manda ese segundo
    // `redirect_uri` es Supabase, y solo cambia con un dominio propio de
    // Supabase, que es de pago.
    //
    // Asi que el salto de vuelta de Discord pasa por supabase.co, como
    // siempre. Todo lo demas -datos, imagenes, refresco de sesion- sigue por
    // el proxy, que es la mayor parte del uso.
    salida.set('location', nueva)
  }

  // ── Cookies
  //
  // Supabase las marca para su propio dominio. Servidas desde aqui, ese
  // dominio no encaja y el navegador las tira sin decir nada.
  // `getSetCookie` es lo que hay en Workers hoy; `getAll` era lo de antes y ya
  // no existe en todos los tiempos de ejecucion. Se prueban los dos y si no
  // hay ninguno se deja como esta: la sesion vive en localStorage, no en
  // cookies, asi que esto es una red de seguridad, no el camino normal.
  const galletas =
    typeof salida.getSetCookie === 'function' ? salida.getSetCookie()
    : typeof salida.getAll === 'function' ? salida.getAll('set-cookie')
    : []
  if (galletas.length) {
    salida.delete('set-cookie')
    for (const c of galletas) {
      salida.append('set-cookie', c.replace(/;\s*Domain=[^;]*/gi, ''))
    }
  }

  // Nada de esto se guarda en cache: son datos de cada jugador, y una
  // respuesta cacheada aqui se le serviria al siguiente.
  salida.set('cache-control', 'no-store')
  salida.delete('content-encoding')
  salida.delete('content-length')

  return new Response(respuesta.body, {
    status: respuesta.status,
    statusText: respuesta.statusText,
    headers: salida,
  })
}
