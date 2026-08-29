import type { Metadata } from 'next'
import { PaginaLegal, Nota } from '@/components/legal/PaginaLegal'
import { EMAIL, WHATSAPP, enlaceWhatsApp } from '@/lib/contacto'

export const metadata: Metadata = {
  title: 'Política de privacidad · La Elite PvP',
  description:
    'Qué datos recoge La Elite PvP, para qué se usan, con quién se comparten y cómo pedir que se borren.',
  alternates: { canonical: '/privacidad' },
}

/**
 * Política de privacidad.
 *
 * Está escrita a partir de lo que el código HACE de verdad —las tablas de
 * Supabase, el bot de Discord, los avisos de Telegram, lo que se guarda en el
 * navegador—, no de una plantilla genérica. Una política que promete cosas que
 * el sitio no cumple es peor que no tenerla.
 *
 * Si mañana se añade un dato nuevo (una tabla, un servicio externo), hay que
 * actualizar esta página. Es parte del trabajo, no un extra.
 */
export default function Privacidad() {
  return (
    <PaginaLegal
      titulo="Política de privacidad"
      entradilla="Qué datos recogemos, para qué, y cómo pedir que los borremos. Sin letra pequeña."
      actualizado="29 de agosto de 2026"
    >
      <p>
        La Elite PvP es un clan competitivo de Free Fire que además vende recargas de diamantes
        y premia la actividad de su comunidad. Esta página explica qué información manejamos y
        por qué. El responsable del tratamiento es el equipo de La Elite PvP, con contacto en{' '}
        <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
      </p>

      <h2>Qué datos recogemos</h2>

      <h3>Si compras diamantes</h3>
      <p>Para poder entregarte la recarga y cobrarte necesitamos:</p>
      <ul>
        <li>Tu <strong>nombre o apodo</strong> y tu <strong>ID de Free Fire</strong>.</li>
        <li>Un <strong>medio de contacto</strong> (Discord o WhatsApp), para avisarte del pedido.</li>
        <li>El <strong>país, el método de pago y el importe</strong> de la compra.</li>
      </ul>
      <p>
        <strong>No guardamos datos de tarjetas ni credenciales bancarias.</strong> El pago ocurre
        íntegramente en la plataforma que elijas (Binance, PayPal, Zelle, Pago Móvil, Nequi) y
        nosotros solo vemos que se completó.
      </p>

      <h3>Si entras con Discord</h3>
      <p>
        Al iniciar sesión, Discord nos entrega tu <strong>identificador, nombre de usuario y
        foto de perfil</strong>. Nada más: no accedemos a tus mensajes privados, ni a tu correo
        de Discord, ni a otros servidores en los que estés.
      </p>

      <h3>Si participas en la comunidad (Elite Coin)</h3>
      <p>Para poder pagarte las recompensas registramos:</p>
      <ul>
        <li>Tus <strong>Elite Coin</strong> y el historial de cómo las ganaste o gastaste.</li>
        <li>
          Tu <strong>actividad en nuestro servidor de Discord</strong>: cuántos minutos pasas en
          canales de voz y cuántos mensajes escribes, por día. Guardamos <em>cuántos</em>, nunca
          <em> qué</em> escribiste: el contenido de tus mensajes no se almacena en ningún sitio.
        </li>
        <li>
          Si vinculas tu cuenta, tus <strong>estadísticas públicas de Free Fire</strong> (kills,
          K/D, Booyahs), que ya son visibles para cualquiera dentro del juego.
        </li>
      </ul>

      <h3>Si solo navegas</h3>
      <p>
        Registramos visitas de forma agregada (qué página se vio, desde qué sitio se llegó) para
        saber qué funciona. <strong>No usamos tu dirección IP para identificarte</strong>: se
        emplea unos minutos, en memoria, solo para no repetir el mismo aviso interno, y no queda
        guardada.
      </p>

      <h2>Para qué usamos todo esto</h2>
      <ul>
        <li>Entregarte lo que compras y atenderte si algo sale mal.</li>
        <li>Llevar el ranking de Elite Coin y pagar las recompensas que te toquen.</li>
        <li>Mantener el juego limpio: los topes diarios y los controles anti-spam existen para
          que quien hace trampa no se lleve los premios de quien juega.</li>
        <li>Entender qué secciones se usan, para mejorarlas.</li>
      </ul>
      <p>
        <strong>No vendemos tus datos a nadie, ni los cedemos con fines publicitarios.</strong>
      </p>

      <h2>Qué es público</h2>
      <p>
        El ranking de Elite Coin muestra tu <strong>nombre visible, tu foto y tu saldo</strong> a
        cualquiera que entre a la web, incluso sin iniciar sesión. Esa es la gracia del ranking.
        Si no quieres aparecer, escríbenos y te sacamos.
      </p>
      <p>
        Las estadísticas de los miembros oficiales del clan también son públicas, igual que en el
        propio juego.
      </p>

      <h2>Con quién se comparte</h2>
      <p>Usamos estos servicios, y solo estos:</p>
      <ul>
        <li><strong>Supabase</strong> — guarda la base de datos y gestiona el inicio de sesión.</li>
        <li><strong>Cloudflare</strong> — sirve la web.</li>
        <li><strong>Discord</strong> — inicio de sesión y el bot de la comunidad.</li>
        <li><strong>Telegram</strong> — nos avisa a nosotros cuando entra un pedido. Solo lo
          recibe el equipo del clan.</li>
        <li><strong>Google AdSense</strong> — si en algún momento activamos anuncios. Mientras no
          lo hagamos, no se carga nada de Google ni se instalan sus cookies.</li>
      </ul>

      <h2>Cuánto tiempo lo guardamos</h2>
      <ul>
        <li><strong>Pedidos:</strong> mientras hagan falta para el soporte y la contabilidad.</li>
        <li><strong>Actividad de Discord y movimientos de coins:</strong> mientras tu cuenta esté activa.</li>
        <li><strong>Datos del mercado:</strong> las velas se borran solas a los 8 días, y las
          operaciones a los 3.</li>
      </ul>

      <h2>Tus derechos</h2>
      <p>
        Puedes pedirnos <strong>ver, corregir o borrar</strong> lo que tenemos sobre ti, o que
        dejemos de usarlo. Escríbenos a <a href={`mailto:${EMAIL}`}>{EMAIL}</a> o por{' '}
        <a href={enlaceWhatsApp('Hola, quiero consultar sobre mis datos personales.')}
           target="_blank" rel="noopener noreferrer">WhatsApp ({WHATSAPP})</a>.
        Respondemos en un plazo razonable y sin pedirte explicaciones.
      </p>

      <Nota>
        <strong>Sobre menores de edad.</strong> Free Fire tiene una comunidad joven. Si eres menor
        de edad, pide permiso a tu madre, padre o tutor antes de comprar o de facilitarnos datos.
        Si nos avisan de que tenemos datos de un menor sin ese permiso, los borramos.
      </Nota>

      <h2>Cambios</h2>
      <p>
        Si cambiamos algo importante, actualizamos la fecha de arriba. Merece la pena echar un
        ojo de vez en cuando.
      </p>
    </PaginaLegal>
  )
}
