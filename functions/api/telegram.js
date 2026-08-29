/**
 * Webhook de Telegram: convierte los botones del aviso en cambios reales.
 *
 * POR QUE EXISTE
 * --------------
 * El aviso solo, sin botones, obliga a abrir el panel para mover el pedido: son
 * treinta segundos y varios toques con el telefono en la mano, justo cuando el
 * cliente esta esperando. Aqui el pedido pasa a "pagado" o "entregado" con un
 * toque en la propia notificacion, y el mensaje se reescribe para que se vea en
 * que estado quedo y quien lo movio.
 *
 * SEGURIDAD
 * ---------
 * Esta URL es publica, asi que cualquiera podria fingir ser Telegram y aceptar
 * pedidos. Dos cerrojos:
 *   1. Cabecera secreta que Telegram envia en cada peticion (secret_token de
 *      setWebhook), comparada contra TELEGRAM_WEBHOOK_SECRET.
 *   2. Solo se obedece a TELEGRAM_CHAT_ID: pulsaciones de otros chats se
 *      ignoran aunque el secreto se filtrara.
 *
 * Variables necesarias en Cloudflare Pages:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_WEBHOOK_SECRET,
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { tg, esc, chatId } from '../_lib/telegram.js'

/** Que estado deja cada boton, y como se marca en el mensaje. */
const ACCIONES = {
  ok: { estado: 'paid', sello: '✅ ACEPTADO', aviso: 'Pedido aceptado' },
  del: { estado: 'delivered', sello: '💎 ENTREGADO', aviso: 'Diamantes entregados' },
  no: { estado: 'cancelled', sello: '✖ CANCELADO', aviso: 'Pedido cancelado' },
}

/**
 * Actualiza el pedido con la service role key.
 *
 * Se usa REST directo en vez del SDK de Supabase porque esto corre en el
 * runtime de Cloudflare Workers y una sola peticion no justifica arrastrar la
 * libreria entera al bundle de la funcion.
 */
async function moverPedido(env, referencia, estado) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return { ok: false, error: 'sin-credenciales' }
  try {
    const res = await fetch(
      `${url}/rest/v1/orders?order_number=eq.${encodeURIComponent(referencia)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ status: estado, updated_at: new Date().toISOString() }),
      }
    )
    const data = await res.json()
    if (!res.ok) return { ok: false, error: JSON.stringify(data) }
    // Un array vacio significa que la referencia no existe: hay que decirlo, no
    // dar por bueno un cambio que no ocurrio.
    if (!Array.isArray(data) || data.length === 0) return { ok: false, error: 'no-encontrado' }
    return { ok: true, pedido: data[0] }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

async function manejarBoton(env, cb) {
  const [accion, referencia] = String(cb.data || '').split(':')
  const conf = ACCIONES[accion]
  const responder = (text, alert = false) =>
    tg(env, 'answerCallbackQuery', { callback_query_id: cb.id, text, show_alert: alert })

  if (!conf || !referencia) return responder('Acción desconocida', true)

  const r = await moverPedido(env, referencia, conf.estado)
  if (!r.ok) {
    return responder(
      r.error === 'no-encontrado' ? `No existe el pedido ${referencia}` : 'Error al guardar',
      true
    )
  }

  await responder(conf.aviso)

  // El mensaje original se reescribe en lugar de mandar uno nuevo: asi el chat
  // no se llena de duplicados y siempre se ve el estado actual del pedido.
  const quien = cb.from?.first_name || cb.from?.username || 'staff'
  const base = cb.message?.text ? esc(cb.message.text) : `Pedido ${esc(referencia)}`
  await tg(env, 'editMessageText', {
    chat_id: cb.message.chat.id,
    message_id: cb.message.message_id,
    text: `${base}\n\n<b>${conf.sello}</b> · por ${esc(quien)}`,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_markup:
      conf.estado === 'paid'
        ? // Aceptado todavia admite el siguiente paso; entregado y cancelado no.
          { inline_keyboard: [[{ text: '💎 Entregado', callback_data: `del:${referencia}` }]] }
        : { inline_keyboard: [] },
  })
  return { ok: true }
}

/** Ultimos pedidos sin cerrar, para el comando /pedidos. */
async function pedidosAbiertos(env) {
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const res = await fetch(
      `${url}/rest/v1/orders?status=in.(pending,paid,processing)&order=created_at.desc&limit=10&select=order_number,customer_name,free_fire_id,total_usd,status`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

async function manejarComando(env, msg) {
  const texto = String(msg.text || '').trim().toLowerCase()
  const chat = msg.chat.id

  if (texto.startsWith('/start') || texto.startsWith('/ayuda')) {
    return tg(env, 'sendMessage', {
      chat_id: chat,
      parse_mode: 'HTML',
      text:
        '⚔️ <b>La Elite PvP</b> — alertas activas.\n\n' +
        'Te aviso al instante de cada venta y podés aceptarla desde el botón.\n\n' +
        '/pedidos — pedidos sin cerrar\n' +
        `<code>chat_id: ${chat}</code>`,
    })
  }

  if (texto.startsWith('/pedidos')) {
    const filas = await pedidosAbiertos(env)
    if (!filas) {
      return tg(env, 'sendMessage', { chat_id: chat, text: 'No pude consultar la base de datos.' })
    }
    if (filas.length === 0) {
      return tg(env, 'sendMessage', { chat_id: chat, text: '✅ Nada pendiente. Todo entregado.' })
    }
    const cuerpo = filas
      .map(
        (p) =>
          `• <code>${esc(p.order_number)}</code> — ${esc(p.customer_name)} · $${Number(
            p.total_usd || 0
          ).toFixed(2)} · <i>${esc(p.status)}</i>`
      )
      .join('\n')
    return tg(env, 'sendMessage', {
      chat_id: chat,
      parse_mode: 'HTML',
      text: `🧾 <b>${filas.length} pedido(s) sin cerrar</b>\n\n${cuerpo}`,
    })
  }
  return { ok: true }
}

export async function onRequestPost(context) {
  const env = context.env

  // Cerrojo 1: el secreto que solo conocen Telegram y esta funcion.
  const esperado = env.TELEGRAM_WEBHOOK_SECRET
  const recibido = context.request.headers.get('x-telegram-bot-api-secret-token')
  if (esperado && recibido !== esperado) {
    return new Response('forbidden', { status: 403 })
  }

  let update
  try {
    update = await context.request.json()
  } catch {
    return Response.json({ ok: true })
  }

  // Cerrojo 2: solo tu chat manda. Se responde 200 igualmente para que Telegram
  // no reintente en bucle una actualizacion que nunca vamos a aceptar.
  const permitido = String(chatId(env) || '')
  const origen = String(
    update.callback_query?.message?.chat?.id ?? update.message?.chat?.id ?? ''
  )
  if (permitido && origen && origen !== permitido) return Response.json({ ok: true })

  try {
    if (update.callback_query) await manejarBoton(env, update.callback_query)
    else if (update.message) await manejarComando(env, update.message)
  } catch {
    // Un fallo aqui no debe hacer que Telegram reintente el mismo update sin fin.
  }
  return Response.json({ ok: true })
}
