/**
 * Punto de entrada de las interacciones de Discord.
 *
 * POR QUE ESTO Y NO UN BOT ENCENDIDO
 * ----------------------------------
 * Un bot normal mantiene una conexion abierta con Discord y por ahi recibe los
 * clics. Eso obliga a tener un proceso vivo en algun sitio: si se cierra la
 * ventana del .bat, nadie puede apostar ni cerrar una apuesta hasta que se
 * vuelva a abrir.
 *
 * Discord ofrece otra via: registrar una URL y que EL mande una peticion cada
 * vez que alguien pulsa un boton. Sin proceso, sin servidor encendido, sin
 * depender de un ordenador concreto. Y como todo el flujo de apuestas son
 * botones y formularios, encaja entero.
 *
 * Lo unico que NO se puede hacer asi es contar minutos en un canal de voz: eso
 * exige estar conectado escuchando, y sigue en el bot del PC.
 */

const DISCORD_API = 'https://discord.com/api/v10'

/**
 * Comprueba que la peticion viene de Discord de verdad.
 *
 * ESTE PASO NO ES OPCIONAL. La URL es publica: sin firma, cualquiera podria
 * mandar un "veredicto" falso y hacer que el bote se pague a quien quisiera.
 * Discord firma cada peticion con Ed25519 y aqui se verifica contra la clave
 * publica de la aplicacion.
 */
async function firmaValida(request, cuerpo, clavePublica) {
  const firma = request.headers.get('x-signature-ed25519')
  const momento = request.headers.get('x-signature-timestamp')
  if (!firma || !momento || !clavePublica) return false

  const aBytes = (hex) =>
    new Uint8Array((hex.match(/.{1,2}/g) || []).map((b) => parseInt(b, 16)))

  try {
    const clave = await crypto.subtle.importKey(
      'raw',
      aBytes(clavePublica),
      { name: 'Ed25519', namedCurve: 'Ed25519' },
      false,
      ['verify']
    )
    return await crypto.subtle.verify(
      'Ed25519',
      clave,
      aBytes(firma),
      new TextEncoder().encode(momento + cuerpo)
    )
  } catch {
    return false
  }
}

/**
 * Diagnostico TEMPORAL: comprueba que este entorno sabe hacer Ed25519.
 *
 * Es lo unico que puede tumbar todo el enfoque, asi que se confirma ANTES de
 * construir el resto. Se retira en cuanto este comprobado.
 */
export async function onRequestGet() {
  const prueba = {}
  try {
    const par = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
    const datos = new TextEncoder().encode('la elite pvp')
    const firma = await crypto.subtle.sign('Ed25519', par.privateKey, datos)
    prueba.ed25519 = await crypto.subtle.verify('Ed25519', par.publicKey, firma, datos)
  } catch (e) {
    prueba.ed25519 = false
    prueba.error = String(e)
  }
  return Response.json(prueba)
}
