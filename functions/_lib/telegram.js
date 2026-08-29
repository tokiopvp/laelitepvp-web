/**
 * Capa de Telegram para las alertas de la tienda.
 *
 * POR QUE TELEGRAM Y NO SOLO DISCORD
 * ----------------------------------
 * El webhook de Discord llega al canal, pero la notificacion del movil depende
 * de que la app este instalada, con el canal sin silenciar y la sesion abierta.
 * Una venta que se entera veinte minutos tarde es una venta que el cliente ya
 * fue a buscar a otro lado. Telegram entrega al telefono en segundos y, sobre
 * todo, permite BOTONES: aceptar el pedido y marcarlo entregado desde la propia
 * notificacion, sin abrir el panel.
 *
 * El token y el chat viven en variables de entorno de Cloudflare Pages
 * (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID). Nunca en el codigo: cualquiera con el
 * token puede escribir y leer como el bot.
 */

const API = 'https://api.telegram.org/bot'

/** Escapa para parse_mode HTML de Telegram (los otros modos rompen con nicks raros). */
export function esc(v) {
  return String(v ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Llama a la API de Telegram. Nunca lanza: una alerta que falla no puede
 * tumbar la compra del cliente, que es lo unico que de verdad importa aqui.
 */
export async function tg(env, method, payload) {
  const token = env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false, reason: 'no-token' }
  try {
    const res = await fetch(`${API}${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export function chatId(env) {
  return env.TELEGRAM_CHAT_ID || null
}

/**
 * Mensaje de venta con botones de accion.
 *
 * Los `callback_data` de Telegram tienen un limite duro de 64 bytes, por eso se
 * manda solo `accion:referencia` y el resto se relee de la base de datos cuando
 * se pulsa: meter el pedido entero en el boton lo truncaria en silencio.
 */
export function tecladoPedido(referencia, ffid) {
  const filas = [
    [
      { text: '✅ Aceptar', callback_data: `ok:${referencia}` },
      { text: '💎 Entregado', callback_data: `del:${referencia}` },
    ],
    [{ text: '✖ Cancelar', callback_data: `no:${referencia}` }],
  ]
  if (ffid && /^\d{5,15}$/.test(String(ffid))) {
    // Atajo directo a la recarga oficial con el ID ya a mano.
    filas.push([{ text: '🔗 Abrir recarga', url: 'https://shop.garena.com/' }])
  }
  return { inline_keyboard: filas }
}
