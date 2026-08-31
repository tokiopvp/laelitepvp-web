/**
 * Apuestas PvP: las interacciones de Discord, sin bot encendido.
 *
 * POR QUE ESTO Y NO UN BOT
 * ------------------------
 * Un bot normal mantiene una conexion abierta con Discord y por ahi recibe los
 * clics. Eso obliga a tener un proceso vivo: si se cierra la ventana del .bat,
 * nadie puede apostar ni cerrar una apuesta hasta que se vuelva a abrir. Y con
 * el ordenador apagado, la comunidad se queda sin apuestas.
 *
 * Discord ofrece otra via: registrar una URL y que EL mande una peticion cada
 * vez que alguien pulsa un boton. Sin proceso, sin servidor encendido. Como
 * todo el flujo de apuestas son botones y formularios, encaja entero, y corre
 * en el mismo Cloudflare que ya sirve la web.
 *
 * Lo unico que NO se puede hacer asi es contar minutos en un canal de voz: eso
 * exige estar conectado escuchando, y sigue en el bot del PC.
 *
 * LOS TRES SEGUNDOS
 * -----------------
 * Discord corta la interaccion si no se responde en 3 segundos. Aqui se
 * responde SIEMPRE de inmediato -normalmente con un mensaje efimero- y el
 * trabajo lento (publicar en otro canal, crear la sala) se hace despues con
 * `waitUntil`, que deja la peticion terminada mientras la tarea sigue.
 *
 * Variables necesarias en Cloudflare Pages:
 *   DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN,
 *   DISCORD_CANAL_APUESTAS, DISCORD_CANAL_RESULTADOS,
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const API = 'https://discord.com/api/v10'
const WEB = 'https://www.laelitepvp.com'

const ORO = 0xe8b33c
const BRASA = 0xe11d3c
const VERDE = 0x2ebd85
const GRIS = 0x8e8175

// Tipos de interaccion que manda Discord.
const PING = 1
const COMPONENTE = 3
const MODAL = 5

// Tipos de respuesta.
const PONG = 1
const MENSAJE = 4
const MODAL_ABRIR = 9

// 64 = solo lo ve quien pulso.
const EFIMERO = 64

// ---------------------------------------------------------------- utilidades

/** 1200000 -> "1.200.000". Los saldos se leen mejor completos. */
function moneda(n) {
  return Math.round(Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function responder(datos) {
  return Response.json(datos)
}

function texto(contenido, efimero = true) {
  return responder({
    type: MENSAJE,
    data: { content: contenido, flags: efimero ? EFIMERO : 0 },
  })
}

/**
 * Comprueba que la peticion viene de Discord.
 *
 * NO ES OPCIONAL. La URL es publica: sin firma, cualquiera podria mandar un
 * "veredicto" falso y hacer que el bote se pague a quien quisiera.
 */
async function firmaValida(request, cuerpo, clavePublica) {
  const firma = request.headers.get('x-signature-ed25519')
  const momento = request.headers.get('x-signature-timestamp')
  if (!firma || !momento || !clavePublica) return false
  const aBytes = (hex) =>
    new Uint8Array((hex.match(/.{1,2}/g) || []).map((b) => parseInt(b, 16)))
  try {
    const clave = await crypto.subtle.importKey(
      'raw', aBytes(clavePublica), { name: 'Ed25519' }, false, ['verify']
    )
    return await crypto.subtle.verify(
      'Ed25519', clave, aBytes(firma),
      new TextEncoder().encode(momento + cuerpo)
    )
  } catch {
    return false
  }
}

/** Llamada a una funcion de Postgres con la clave de servicio. */
async function rpc(env, fn, payload) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { ok: false, error: 'Servidor sin configurar.' }
  try {
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const d = await r.json()
    return typeof d === 'object' && d !== null ? d : { ok: false, error: 'Respuesta rara.' }
  } catch {
    return { ok: false, error: 'No pude hablar con el servidor. Inténtalo otra vez.' }
  }
}

async function tabla(env, ruta) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  try {
    const r = await fetch(`${url}/rest/v1/${ruta}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    return r.ok ? await r.json() : []
  } catch {
    return []
  }
}

async function actualizar(env, tablaNombre, id, cambios) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  try {
    await fetch(`${url}/rest/v1/${tablaNombre}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cambios),
    })
  } catch {
    /* silencioso: no debe tumbar la interaccion */
  }
}

/** Publica un mensaje en un canal, con el token del bot. */
async function publicar(env, canal, cuerpo) {
  if (!canal || !env.DISCORD_BOT_TOKEN) return null
  try {
    const r = await fetch(`${API}/channels/${canal}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cuerpo),
    })
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}

/** Reescribe un mensaje ya publicado (el reto pasa a "en combate", etc.). */
async function editar(env, canal, mensaje, cuerpo) {
  if (!canal || !mensaje || !env.DISCORD_BOT_TOKEN) return
  try {
    await fetch(`${API}/channels/${canal}/messages/${mensaje}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cuerpo),
    })
  } catch {
    /* si no se puede editar, el flujo sigue igual */
  }
}

async function borrar(env, canal, mensaje) {
  if (!canal || !mensaje || !env.DISCORD_BOT_TOKEN) return
  try {
    await fetch(`${API}/channels/${canal}/messages/${mensaje}`, {
      method: 'DELETE',
      headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
    })
  } catch {
    /* nada */
  }
}

/**
 * Si quien pulsa puede dar un veredicto.
 *
 * Se mira el permiso "Gestionar mensajes" que Discord manda dentro de la propia
 * interaccion. No hace falta consultar nada: viene firmado en la peticion, asi
 * que no se puede falsear.
 */
function esModerador(it, env) {
  const permisos = BigInt(it.member?.permissions || '0')
  const GESTIONAR_MENSAJES = 1n << 13n
  const ADMIN = 1n << 3n
  if (permisos & (GESTIONAR_MENSAJES | ADMIN)) return true
  const rol = env.DISCORD_ROL_MODERADOR
  return !!rol && (it.member?.roles || []).includes(rol)
}

// ---------------------------------------------------------------- vistas

function botonesReto(id) {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: 'ACEPTAR RETO', emoji: { name: '🤝' }, custom_id: `elite:aceptar:${id}` },
        { type: 2, style: 2, label: 'Cancelar', custom_id: `elite:cancelar:${id}` },
      ],
    },
  ]
}

function botonesVeredicto(id, a, b) {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 1, label: `Gana ${String(a).slice(0, 28)}`, emoji: { name: '1️⃣' }, custom_id: `elite:gana:${id}:a` },
        { type: 2, style: 1, label: `Gana ${String(b).slice(0, 28)}`, emoji: { name: '2️⃣' }, custom_id: `elite:gana:${id}:b` },
      ],
    },
    {
      type: 1,
      components: [
        { type: 2, style: 4, label: 'Anular y devolver', custom_id: `elite:anular:${id}` },
      ],
    },
  ]
}

// ---------------------------------------------------------------- acciones

async function saldo(env, it) {
  const r = await rpc(env, 'bet_saldo', { p_discord: it.member.user.id })
  if (!r.ok) {
    return texto(`❌ ${r.error}\n\nEntra una vez en ${WEB}/comunidad con Discord y tu cuenta queda enlazada.`)
  }
  const lineas = [`💰 **${r.nombre}**`, `Disponible: **${moneda(r.saldo)}** Elite Coin`]
  if (Number(r.comprometido) > 0) {
    // Lo comprometido se muestra aparte: si no, alguien cree que le faltan
    // coins cuando en realidad estan en un bote.
    lineas.push(`En apuestas: ${moneda(r.comprometido)}`)
  }
  return texto(lineas.join('\n'))
}

async function misApuestas(env, it) {
  const did = it.member.user.id
  const filas = await tabla(
    env,
    `bets?or=(creador_discord.eq.${did},rival_discord.eq.${did})` +
      `&estado=in.(abierta,jugando)&select=id,monto,estado,rival_nombre&limit=10`
  )
  if (!filas.length) return texto('No tienes apuestas activas.')
  return texto(
    filas
      .map(
        (f) =>
          `\`${String(f.id).slice(0, 8)}\` · **${moneda(f.monto)}** · ${f.estado}` +
          (f.rival_nombre ? ` · vs ${f.rival_nombre}` : '')
      )
      .join('\n')
  )
}

async function crear(env, it, ctx) {
  const bruto = it.data.components?.[0]?.components?.[0]?.value ?? ''
  const monto = parseInt(String(bruto).replace(/\D/g, ''), 10)
  if (!monto || monto <= 0) {
    return texto('Eso no es un número. Escribe solo la cantidad, por ejemplo `500`.')
  }

  const r = await rpc(env, 'bet_create', {
    p_discord: it.member.user.id,
    p_monto: monto,
  })
  if (!r.ok) return texto(`❌ ${r.error}`)

  const usuario = it.member.user
  const avatar = usuario.avatar
    ? `https://cdn.discordapp.com/avatars/${usuario.id}/${usuario.avatar}.png`
    : null

  // Publicar el reto es lo lento: se hace despues de responder, para no gastar
  // los tres segundos que da Discord.
  ctx.waitUntil(
    (async () => {
      const msg = await publicar(env, env.DISCORD_CANAL_APUESTAS, {
        embeds: [
          {
            title: '⚔️ RETO ABIERTO',
            description:
              `**${usuario.global_name || usuario.username}** apuesta **${moneda(monto)}** Elite Coin.\n\n` +
              `El primero que acepte pone lo mismo. **Bote: ${moneda(monto * 2)}**.`,
            color: ORO,
            ...(avatar ? { thumbnail: { url: avatar } } : {}),
            footer: { text: 'La Elite PvP · el ganador se lo lleva todo' },
          },
        ],
        components: botonesReto(r.id),
      })
      if (msg) {
        await actualizar(env, 'bets', r.id, {
          mensaje_id: String(msg.id),
          canal_id: String(msg.channel_id),
        })
      }
    })()
  )

  return texto(
    `✅ Reto publicado por **${moneda(monto)}** coins.\nTe quedan **${moneda(r.saldo)}**.`
  )
}

async function aceptar(env, it, id, ctx) {
  const r = await rpc(env, 'bet_accept', { p_bet: id, p_discord: it.member.user.id })
  if (!r.ok) return texto(`❌ ${r.error}`)

  const bote = Number(r.bote)
  const canal = it.channel_id
  const mensaje = it.message?.id

  ctx.waitUntil(
    (async () => {
      // El reto se reescribe en vez de mandar otro: asi el canal no acumula
      // ofertas muertas y siempre se ve el estado real.
      await editar(env, canal, mensaje, {
        embeds: [
          {
            title: '🔥 EN COMBATE',
            description:
              `<@${r.creador_discord}>  **VS**  <@${r.rival_discord}>\n\n` +
              `Bote: **${moneda(bote)}** Elite Coin.\n` +
              `Jugad el PvP y subid la foto del resultado.`,
            color: BRASA,
            footer: { text: 'La Elite PvP · esperando resultado' },
          },
        ],
        components: [],
      })

      await publicar(env, env.DISCORD_CANAL_RESULTADOS, {
        embeds: [
          {
            title: '📸 Resultado pendiente',
            description:
              `**${r.creador}**  vs  **${r.rival}**\n` +
              `Bote: **${moneda(bote)}** Elite Coin\n\n` +
              `<@${r.creador_discord}> <@${r.rival_discord}> subid aquí la captura del resultado.\n\n` +
              `*Un moderador dará el veredicto con los botones.*`,
            color: GRIS,
            footer: { text: `apuesta ${String(id).slice(0, 8)}` },
          },
        ],
        components: botonesVeredicto(id, r.creador, r.rival),
      })
    })()
  )

  return texto(`⚔️ Aceptaste el reto por **${moneda(r.monto)}** coins.`)
}

async function cancelar(env, it, id, ctx) {
  const mod = esModerador(it, env)
  const r = await rpc(env, 'bet_cancel', {
    p_bet: id,
    p_discord: it.member.user.id,
    p_es_mod: mod,
  })
  if (!r.ok) return texto(`❌ ${r.error}`)

  const canal = it.channel_id
  const mensaje = it.message?.id
  ctx.waitUntil(
    (async () => {
      await editar(env, canal, mensaje, {
        embeds: [
          { title: '✖ Reto cancelado', description: 'Las Elite Coin se devolvieron.', color: GRIS },
        ],
        components: [],
      })
      // Un reto cancelado no le interesa a nadie: fuera del tablon.
      await new Promise((r2) => setTimeout(r2, 10000))
      await borrar(env, canal, mensaje)
    })()
  )
  return texto(`Devuelto: **${moneda(r.devuelto)}** coins.`)
}

async function veredicto(env, it, id, lado, ctx) {
  // Este es el unico boton que mueve un bote entero: se comprueba el permiso
  // ANTES de tocar nada.
  if (!esModerador(it, env)) return texto('Solo un moderador puede dar el veredicto.')

  const filas = await tabla(env, `bets?id=eq.${id}&select=*`)
  const b = filas[0]
  if (!b) return texto('Esa apuesta ya no existe.')

  const ganador = lado === 'a' ? b.creador_discord : b.rival_discord
  const r = await rpc(env, 'bet_resolve', {
    p_bet: id,
    p_ganador_discord: ganador,
    p_moderador: it.member.user.id,
    p_prueba: null,
  })
  if (!r.ok) return texto(`❌ ${r.error}`)

  const canal = it.channel_id
  const mensaje = it.message?.id
  ctx.waitUntil(
    (async () => {
      await editar(env, canal, mensaje, {
        embeds: [
          {
            title: '🏆 VEREDICTO',
            description:
              `Gana **${r.ganador}** — se lleva **${moneda(r.pago)}** Elite Coin.\n` +
              `Pierde **${r.perdedor}**.\n\n` +
              `Saldo del ganador: **${moneda(r.saldo_ganador)}**\n` +
              `[Ver el movimiento en el gráfico](${WEB}/comunidad)`,
            color: VERDE,
            footer: { text: `veredicto de ${it.member.user.global_name || it.member.user.username}` },
          },
        ],
        components: [],
      })
      // El "EN COMBATE" del tablon ya no significa nada.
      await borrar(env, b.canal_id, b.mensaje_id)
      // Y el anuncio publico del pago, que SI se queda: es el registro.
      await publicar(env, canal, {
        content: `✅ <@${ganador}> se lleva **${moneda(r.pago)}** Elite Coin.`,
      })
    })()
  )

  return texto('Veredicto registrado y pagado.')
}

async function anular(env, it, id, ctx) {
  if (!esModerador(it, env)) return texto('Solo un moderador puede anular una apuesta.')
  const filas = await tabla(env, `bets?id=eq.${id}&select=canal_id,mensaje_id`)
  const r = await rpc(env, 'bet_cancel', {
    p_bet: id,
    p_discord: it.member.user.id,
    p_es_mod: true,
  })
  if (!r.ok) return texto(`❌ ${r.error}`)

  const canal = it.channel_id
  const mensaje = it.message?.id
  ctx.waitUntil(
    (async () => {
      await editar(env, canal, mensaje, {
        embeds: [
          {
            title: '✖ Apuesta anulada',
            description: `Se devolvieron **${moneda(r.devuelto)}** coins a cada uno.`,
            color: GRIS,
          },
        ],
        components: [],
      })
      if (filas[0]) await borrar(env, filas[0].canal_id, filas[0].mensaje_id)
    })()
  )
  return texto('Anulada y devuelto a los dos.')
}

// ---------------------------------------------------------------- enrutado

async function atender(env, it, ctx) {
  if (it.type === PING) return responder({ type: PONG })

  // Solo se atiende lo que viene de un servidor: en mensajes privados no hay
  // `member` y todo lo de abajo daria error.
  if (!it.member?.user?.id) {
    return texto('Esto solo funciona dentro del servidor del clan.')
  }

  if (it.type === MODAL && it.data?.custom_id === 'elite:modal') {
    return await crear(env, it, ctx)
  }

  if (it.type !== COMPONENTE) return responder({ type: PONG })

  const partes = String(it.data?.custom_id || '').split(':')
  if (partes[0] !== 'elite') return responder({ type: PONG })

  switch (partes[1]) {
    case 'apostar':
      return responder({
        type: MODAL_ABRIR,
        data: {
          custom_id: 'elite:modal',
          title: 'Nueva apuesta',
          components: [
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: 'monto',
                  label: '¿Cuántas Elite Coin apuestas?',
                  style: 1,
                  placeholder: 'Ej: 500',
                  min_length: 1,
                  max_length: 8,
                  required: true,
                },
              ],
            },
          ],
        },
      })
    case 'saldo':
      return await saldo(env, it)
    case 'mias':
      return await misApuestas(env, it)
    case 'aceptar':
      return await aceptar(env, it, partes[2], ctx)
    case 'cancelar':
      return await cancelar(env, it, partes[2], ctx)
    case 'gana':
      return await veredicto(env, it, partes[2], partes[3], ctx)
    case 'anular':
      return await anular(env, it, partes[2], ctx)
    default:
      return responder({ type: PONG })
  }
}

export async function onRequestPost(context) {
  const { request, env } = context
  const cuerpo = await request.text()

  if (!(await firmaValida(request, cuerpo, env.DISCORD_PUBLIC_KEY))) {
    // Discord EXIGE un 401 aqui para dar la URL por buena al registrarla.
    return new Response('firma no válida', { status: 401 })
  }

  let it
  try {
    it = JSON.parse(cuerpo)
  } catch {
    return new Response('cuerpo no válido', { status: 400 })
  }

  try {
    return await atender(env, it, context)
  } catch (e) {
    // Nunca dejar la interaccion sin respuesta: Discord mostraria "la
    // aplicacion no responde" y la gente pulsaria otra vez.
    return texto(`Algo falló. Avisa a un admin.${env.DEBUG ? ` (${String(e)})` : ''}`)
  }
}


/**
 * Diagnostico TEMPORAL. Dice si la clave publica esta puesta y si se puede
 * importar, nunca su contenido. Se retira en cuanto Discord acepte la URL.
 */
export async function onRequestGet(context) {
  const env = context.env
  const pk = env.DISCORD_PUBLIC_KEY || ''
  const salida = {
    DISCORD_PUBLIC_KEY: { presente: !!pk, largo: pk.length, esperado: 64 },
    DISCORD_BOT_TOKEN: { presente: !!env.DISCORD_BOT_TOKEN },
    DISCORD_CANAL_APUESTAS: { presente: !!env.DISCORD_CANAL_APUESTAS },
    DISCORD_CANAL_RESULTADOS: { presente: !!env.DISCORD_CANAL_RESULTADOS },
    SUPABASE_SERVICE_ROLE_KEY: { presente: !!env.SUPABASE_SERVICE_ROLE_KEY },
  }
  if (pk) {
    try {
      const bytes = new Uint8Array((pk.match(/.{1,2}/g) || []).map((b) => parseInt(b, 16)))
      salida.bytes = bytes.length
      await crypto.subtle.importKey('raw', bytes, { name: 'Ed25519' }, false, ['verify'])
      salida.importa = true
    } catch (e) {
      salida.importa = false
      salida.error = String(e)
    }
  }
  return Response.json(salida)
}
