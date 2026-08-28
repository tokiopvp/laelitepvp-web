/**
 * Calculo del TAMANO DEL BOTON DE DISPARO (1% a 200%).
 *
 * El juego trae 50-60% por defecto para todos, y ese es el problema: el
 * porcentaje se aplica sobre la pantalla, pero el dedo mide lo mismo en un
 * telefono de 6.1" que en uno de 6.8". El mismo 55% da un boton comodo en uno
 * y demasiado pequeño en el otro.
 *
 * Aqui se hace al reves: se parte del tamaño FISICO que conviene al dedo y se
 * calcula que porcentaje lo consigue en esa pantalla concreta.
 *
 * De donde sale el tamaño objetivo
 * --------------------------------
 * La huella del pulgar al tocar ronda los 10-14 mm. Un objetivo tactil por
 * debajo de eso se falla; muy por encima tapa pantalla, que en un juego de
 * disparos es peor que fallar el toque.
 *
 * HONESTIDAD SOBRE LA PRECISION
 * -----------------------------
 * El juego no publica a cuantos milimetros equivale su 100%, asi que la
 * constante de conversion esta CALIBRADA para que un telefono tipico de 6.5"
 * y 20:9 caiga cerca del 55% que trae de fabrica. Es un modelo, no una medida
 * del interior del juego: acierta la direccion y la magnitud del ajuste, y por
 * eso el resultado se entrega como punto de partida para afinar, no como
 * verdad absoluta.
 */
import { type FichaDispositivo, medidasMm } from './dispositivos'

export type Estilo = 'preciso' | 'equilibrado' | 'agresivo'

export interface ResultadoBoton {
  /** Porcentaje a poner en el juego (1-200). */
  porcentaje: number
  /** Diametro fisico que tendra, en mm. */
  mm: number
  /** Que porcentaje del alto de la pantalla ocupa. */
  porcentajeAlto: number
  estilo: Estilo
  explicacion: string
  avisos: string[]
}

/**
 * Diametro objetivo en milimetros segun el estilo de juego.
 *
 * - preciso: boton mas pequeño. Tapa menos pantalla y obliga a colocar bien el
 *   dedo; va con quien juega a distancia media y larga.
 * - equilibrado: la huella comoda del pulgar. Sirve a casi todo el mundo.
 * - agresivo: mas grande, se acierta sin mirar. Cuesta pantalla, pero en
 *   combate pegado importa mas no fallar el toque que ver un poco mas.
 */
const OBJETIVO_MM: Record<Estilo, number> = {
  preciso: 9.5,
  equilibrado: 11.5,
  agresivo: 13.5,
}

/**
 * Constante de calibracion.
 *
 * Ajustada para que 6.5" en 20:9 con estilo equilibrado de ~55%, que es el
 * valor de fabrica. Si algun dia se mide el mapeo real del juego, se cambia
 * SOLO este numero y todo lo demas sigue valiendo.
 */
const K = 0.2955

export function calcularBoton(
  ficha: FichaDispositivo,
  estilo: Estilo = 'equilibrado'
): ResultadoBoton {
  const { alto } = medidasMm(ficha)
  const objetivo = OBJETIVO_MM[estilo]

  // porcentaje = objetivo / (alto_pantalla * K)
  const crudo = (objetivo / (alto * K)) * 100
  // El juego admite de 1 a 200, pero fuera de 30-110 el boton deja de ser util.
  const porcentaje = Math.round(Math.max(30, Math.min(110, crudo)))
  const mm = +(alto * K * (porcentaje / 100)).toFixed(1)

  const avisos: string[] = []
  if (ficha.pulgadas >= 6.7) {
    avisos.push(
      'Tu pantalla es grande, así que necesitas MENOS porcentaje que la mayoría ' +
      'para el mismo botón físico. Si lo dejas en el valor de fábrica, te queda enorme.'
    )
  }
  if (ficha.pulgadas <= 6.1) {
    avisos.push(
      'Pantalla pequeña: necesitas MÁS porcentaje que la media o el botón te ' +
      'queda por debajo de lo que el pulgar acierta con fiabilidad.'
    )
  }
  if (ficha.refresco >= 120) {
    avisos.push(
      `Tu panel es de ${ficha.refresco} Hz: actívalo en los ajustes del juego. ` +
      'Cambia más que cualquier sensibilidad.'
    )
  }

  const explicacion =
    `En tu pantalla de ${ficha.pulgadas}" el alto útil en horizontal es de ` +
    `unos ${Math.round(alto)} mm. Al ${porcentaje}%, el botón mide alrededor de ` +
    `${mm} mm: es la huella con la que el pulgar acierta sin tapar mira.`

  return {
    porcentaje,
    mm,
    porcentajeAlto: +((mm / alto) * 100).toFixed(1),
    estilo,
    explicacion,
    avisos,
  }
}

/** Los tres estilos de golpe, para poder compararlos. */
export function calcularTodos(ficha: FichaDispositivo): Record<Estilo, ResultadoBoton> {
  return {
    preciso: calcularBoton(ficha, 'preciso'),
    equilibrado: calcularBoton(ficha, 'equilibrado'),
    agresivo: calcularBoton(ficha, 'agresivo'),
  }
}

/** Detecta si la pregunta va del boton de disparo. */
export function preguntaPorBoton(texto: string): boolean {
  return /bot[oó]n|boton|tama[nñ]o.*disparo|disparo.*tama[nñ]o|hud|mira.*tama|escala/i.test(texto)
}
