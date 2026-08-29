import type { Metadata } from 'next'
import { PaginaLegal, Nota } from '@/components/legal/PaginaLegal'
import { EMAIL } from '@/lib/contacto'

export const metadata: Metadata = {
  title: 'Términos y condiciones · La Elite PvP',
  description:
    'Condiciones de compra de diamantes, reglas de las Elite Coin y del clan La Elite PvP.',
  alternates: { canonical: '/terminos' },
}

/**
 * Términos y condiciones.
 *
 * Lo importante que tiene que dejar claro, por orden de problemas reales que
 * evita:
 *   1. Que las Elite Coin NO son dinero ni criptomoneda, y que el gráfico del
 *      mercado es un adorno. Sin esto, alguien acabará pidiendo "retirar" su
 *      saldo o denunciando que perdió dinero.
 *   2. Que no somos Garena y que la recarga es un servicio de intermediación.
 *   3. Qué pasa cuando un pedido sale mal.
 */
export default function Terminos() {
  return (
    <PaginaLegal
      titulo="Términos y condiciones"
      entradilla="Las reglas de la tienda, de las Elite Coin y del clan. Léelas antes de comprar."
      actualizado="29 de agosto de 2026"
    >
      <p>
        Al usar laelitepvp.com aceptas lo que hay aquí escrito. Si algo no te encaja, no compres
        y escríbenos: preferimos resolverlo antes que después.
      </p>

      <h2>Quiénes somos</h2>
      <p>
        La Elite PvP es un clan competitivo de Free Fire. Además de competir, vendemos recargas
        de diamantes y premiamos a nuestra comunidad. <strong>No somos Garena ni tenemos
        relación con ella.</strong> Free Fire y Garena son marcas de sus dueños; aquí solo somos
        jugadores.
      </p>

      <h2>Compra de diamantes</h2>

      <h3>Cómo funciona</h3>
      <p>
        Eliges el paquete, nos das tu ID de Free Fire y pagas por el método que prefieras.
        Nosotros hacemos la recarga en tu cuenta. Es un <strong>servicio de intermediación</strong>:
        compramos la recarga y la aplicamos a tu ID.
      </p>

      <h3>El ID es tu responsabilidad</h3>
      <Nota>
        <strong>Revisa tu ID de Free Fire antes de pagar.</strong> Una recarga aplicada a un ID
        equivocado <strong>no se puede deshacer ni recuperar</strong>: los diamantes quedan en la
        cuenta de otra persona y ni nosotros ni Garena podemos sacarlos de ahí. Comprueba el
        número dos veces.
      </Nota>

      <h3>Precios y plazos</h3>
      <ul>
        <li>Los precios en moneda local se calculan con el tipo de cambio del momento. El importe
          que ves al confirmar es el que se respeta, aunque la tasa se mueva después.</li>
        <li>Entregamos lo antes posible, normalmente en minutos. En horas de mucha demanda o si
          Garena tiene incidencias, puede tardar más.</li>
        <li>Si no podemos completar tu recarga, <strong>te devolvemos el dinero íntegro</strong>.</li>
      </ul>

      <h3>Devoluciones</h3>
      <p>
        Una vez los diamantes están en tu cuenta, la compra no tiene vuelta atrás: es un producto
        digital ya consumido. Antes de eso puedes cancelar sin problema. Si algo falló por nuestra
        parte, lo arreglamos o te devolvemos el dinero.
      </p>

      <h2>Elite Coin</h2>

      <Nota>
        <strong>Las Elite Coin no son dinero.</strong> No son una criptomoneda, no se compran, no
        se venden, no se transfieren entre jugadores y no se pueden retirar ni convertir en
        efectivo. Son puntos internos de nuestra comunidad, y su único uso es canjearse por los
        premios de la tienda mientras esos premios estén disponibles.
      </Nota>

      <h3>El gráfico del mercado</h3>
      <p>
        El gráfico de velas de la página de comunidad es <strong>un adorno visual</strong>. Refleja
        cuántas coins está ganando la comunidad, pero <strong>no representa ningún valor real,
        no hay nada que comprar ni vender, y ese precio no te da derecho a nada</strong>. Está ahí
        porque es bonito ver que la comunidad se mueve, y por nada más.
      </p>

      <h3>Cómo se ganan y se pierden</h3>
      <ul>
        <li>Se ganan completando tareas y estando activo en nuestro Discord, con los topes diarios
          que estén vigentes.</li>
        <li>Los valores de las tareas, los precios de los premios y los topes{' '}
          <strong>los ajustamos cuando hace falta</strong> para que la economía se sostenga. Los
          cambios no son retroactivos: lo que ya canjeaste, canjeado está.</li>
        <li>
          <strong>Anulamos coins obtenidas haciendo trampa</strong>: cuentas múltiples, bots,
          macros, spam en los canales o dejar el micro abierto para farmear. En casos graves,
          expulsión del servidor.
        </li>
      </ul>

      <h3>Premios</h3>
      <ul>
        <li>Los premios se entregan manualmente tras revisar el canje. Puede tardar.</li>
        <li>Algunos premios exigen ser <strong>miembro verificado del clan</strong>.</li>
        <li>El stock puede agotarse. Si un premio se retira, las coins gastadas se devuelven.</li>
      </ul>

      <h2>Uso de la web</h2>
      <p>No hace falta mucho. Basta con no:</p>
      <ul>
        <li>Intentar romper, saturar o colarse en la web ni en la base de datos.</li>
        <li>Falsear la identidad de otra persona o usar su ID de Free Fire.</li>
        <li>Automatizar peticiones para conseguir coins o premios.</li>
      </ul>
      <p>Podemos cerrar el acceso a quien haga cualquiera de esas cosas.</p>

      <h2>Límites</h2>
      <p>
        Hacemos esto lo mejor que podemos, pero somos un clan, no una multinacional. La web puede
        caerse, un dato puede llegar tarde y las estadísticas dependen de lo que devuelva el
        juego. <strong>Nuestra responsabilidad se limita al importe que hayas pagado</strong> por
        el pedido en cuestión.
      </p>

      <h2>Contacto</h2>
      <p>
        Para cualquier cosa: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.
        Escribir siempre es mejor que quedarse con la duda.
      </p>
    </PaginaLegal>
  )
}
