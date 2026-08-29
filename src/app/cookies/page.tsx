import type { Metadata } from 'next'
import { PaginaLegal, Nota } from '@/components/legal/PaginaLegal'
import { EMAIL } from '@/lib/contacto'

export const metadata: Metadata = {
  title: 'Cookies y almacenamiento · La Elite PvP',
  description:
    'Qué guarda La Elite PvP en tu navegador, para qué sirve cada cosa y cómo borrarlo.',
  alternates: { canonical: '/cookies' },
}

/**
 * Política de cookies.
 *
 * El sitio casi no usa cookies: lo que guarda es `sessionStorage` y
 * `localStorage`, que no son cookies pero cumplen la misma función y por
 * honestidad se explican igual. Se listan las claves REALES que escribe el
 * código, con su nombre exacto, para que cualquiera pueda comprobarlo abriendo
 * las herramientas del navegador.
 */
export default function Cookies() {
  return (
    <PaginaLegal
      titulo="Cookies y almacenamiento"
      entradilla="Qué guardamos en tu navegador y para qué. Es poco, y casi todo para que la web te funcione mejor."
      actualizado="29 de agosto de 2026"
    >
      <Nota>
        <strong>No usamos cookies de seguimiento ni de publicidad.</strong> No hay perfilado, ni
        píxeles de redes sociales, ni venta de datos a terceros. Por eso tampoco verás un cartel
        de consentimiento pidiéndote que aceptes cosas raras.
      </Nota>

      <h2>Lo que guardamos</h2>

      <h3>Sesión (necesarias)</h3>
      <p>
        Si inicias sesión con Discord, <strong>Supabase</strong> guarda tu sesión en el navegador
        para no pedirte la contraseña en cada página. Sin esto no puedes entrar. Se borra al
        cerrar sesión.
      </p>

      <h3>Preferencias y comodidad</h3>
      <p>Todo esto vive solo en tu navegador. No viaja a ningún servidor:</p>
      <ul>
        <li>
          <code>elite_gama_medida</code> — la potencia estimada de tu equipo. Sirve para apagar
          los efectos pesados en teléfonos justos, que es lo que hace que la web no se arrastre
          en gama baja.
        </li>
        <li>
          <code>elite_visita_avisada</code> — una marca para no repetir el mismo aviso interno en
          cada página que abres.
        </li>
        <li>
          Tus <strong>pedidos pendientes</strong> y los datos que escribiste en el formulario
          (nombre, ID de Free Fire, contacto), para que al volver puedas mandar tu comprobante sin
          teclearlo todo otra vez.
        </li>
      </ul>

      <h3>Publicidad</h3>
      <p>
        Si algún día activamos <strong>Google AdSense</strong>, Google instalará sus propias
        cookies para medir y mostrar anuncios. <strong>Mientras no lo activemos, no se carga nada
        de Google:</strong> ni el script, ni las cookies, ni una sola petición. Cuando lo hagamos,
        actualizaremos esta página y lo verás aquí.
      </p>

      <h2>Cómo borrarlo</h2>
      <p>
        Todo lo de arriba se elimina limpiando los datos del sitio desde tu navegador
        (normalmente en <em>Configuración → Privacidad → Datos de sitios</em>), o navegando en
        modo incógnito.
      </p>
      <p>
        Ten en cuenta que si lo borras perderás la sesión y la lista de tus pedidos pendientes.
        La web seguirá funcionando igual.
      </p>

      <h2>Dudas</h2>
      <p>
        Escríbenos a <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. Si quieres comprobar por ti mismo
        lo que hay guardado, abre las herramientas de desarrollador de tu navegador y mira la
        pestaña de almacenamiento: verás exactamente las claves listadas arriba y nada más.
      </p>
    </PaginaLegal>
  )
}
