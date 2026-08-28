/**
 * Motor de recuperacion: elige la mejor entrada de la base para una pregunta.
 *
 * El reto no es tener respuestas, es ACERTAR con cual. Un buscador ingenuo
 * ("¿contiene la palabra?") falla de dos formas que ya vi en el bot de
 * WhatsApp: engancha con una palabra suelta y responde algo que no viene a
 * cuento, o no reconoce la pregunta porque el usuario escribio "punteria" sin
 * tilde. Aqui se corrigen las dos.
 */
import { BASE, type Entrada } from './base'
import { normalizar, contieneAlguna, contieneFrase, pareceMisma } from './texto'
import { generarSensi, detectarModelo, type ResultadoSensi } from './sensi'
import { fichaDe } from './dispositivos'
import { calcularTodos, preguntaPorBoton, type ResultadoBoton } from './boton'

/**
 * Sinonimos y erratas frecuentes. La gente escribe en el movil, deprisa y sin
 * tildes: si exiges la palabra exacta, no aciertas casi nunca.
 */
const SINONIMOS: Record<string, string[]> = {
  arma: ['pistola', 'fusil', 'rifle', 'weapon'],
  mejor: ['buena', 'bueno', 'recomiendas', 'recomendable', 'conviene', 'sirve'],
  punteria: ['punteria', 'aim', 'apuntar', 'tino'],
  sensibilidad: ['sensi', 'sensibilidad', 'sensivilidad', 'config'],
  rango: ['rank', 'ranked', 'rankeada', 'clasificatoria'],
  celular: ['telefono', 'movil', 'dispositivo', 'equipo', 'aparato'],
  personaje: ['pj', 'char', 'habilidad'],
  cerca: ['cerrado', 'corta', 'pegado', 'rush', 'rushear'],
  lejos: ['larga', 'distancia', 'lejano'],
  trabar: ['lag', 'laguea', 'lagea', 'trabado', 'lento', 'tironea'],
}

/** Expande una palabra a su familia de sinonimos. */
function familia(palabra: string): string[] {
  for (const [raiz, lista] of Object.entries(SINONIMOS)) {
    if (raiz === palabra || lista.includes(palabra)) return [raiz, ...lista]
  }
  return [palabra]
}

/** Palabras sin valor para decidir de qué habla la pregunta. */
const VACIAS = new Set([
  'que', 'cual', 'cuales', 'como', 'donde', 'cuando', 'quien', 'por', 'para',
  'con', 'sin', 'del', 'las', 'los', 'una', 'uno', 'unos', 'unas', 'the',
  'me', 'mi', 'te', 'se', 'le', 'lo', 'la', 'el', 'un', 'y', 'o', 'de', 'en',
  'es', 'son', 'esta', 'este', 'esa', 'ese', 'hay', 'tengo', 'quiero',
  'puedo', 'debo', 'mas', 'muy', 'pero', 'si', 'no', 'al', 'a', 'porque',
])

export interface Respuesta {
  texto: string
  /** Modelo detectado en este turno, para recordarlo en el siguiente. */
  modeloDetectado?: string
  seguir: string[]
  fuente: 'base' | 'sensi' | 'boton' | 'sin_respuesta'
  categoria?: string
  sensi?: ResultadoSensi
  botones?: { modelo: string; pulgadas: number; opciones: Record<string, ResultadoBoton> }
}

/**
 * Puntua una entrada contra la pregunta.
 *
 * Una clave vale mucho; una palabra de apoyo, poco. Y se exige un minimo
 * relativo al largo de la pregunta: en una frase larga, una sola coincidencia
 * suele ser casualidad. Ese fue justo el fallo del bot de WhatsApp, donde
 * preguntar por "Bermuda Remastered" devolvia la ficha de historia del juego
 * solo por la palabra "Bermuda".
 */
function puntuar(entrada: Entrada, tokens: string[], texto: string): number {
  let punt = 0

  for (const clave of entrada.claves) {
    const c = normalizar(clave)
    if (c.includes(' ')) {
      // Frase exacta: la señal más fuerte que hay.
      if (texto.includes(c)) {
        punt += 10
        continue
      }
      // La gente mete palabras en medio ("se me calienta el celular" contra la
      // clave "se calienta") y ademas escribe con erratas. Ambas cosas se
      // toleran aqui.
      if (contieneFrase(texto, c, VACIAS)) punt += 8
    } else if (tokens.some((t) => familia(t).includes(c))) {
      // La clave es sinonimo de alguna palabra de la pregunta.
      punt += 6
    } else if (tokens.some((t) => pareceMisma(t, c))) {
      // Errata directa contra la clave: "botom" -> "boton". Se compara el
      // token contra LA CLAVE, no contra su propia familia: comparar una
      // palabra consigo misma da siempre verdadero y hacia que cualquier
      // pregunta casara con cualquier entrada.
      punt += 5
    }
  }
  for (const apoyo of entrada.apoyo ?? []) {
    const a = normalizar(apoyo)
    if (texto.includes(a)) punt += 2
  }
  return punt
}

const MENSAJES_SIN_RESPUESTA = [
  'De eso todavía no tengo una respuesta que valga la pena. Pregúntame de armas, personajes, mascotas, rango, rotación, sensibilidad o ajustes.',
  'Esa no me la sé bien, y prefiero decírtelo a inventarte algo. Prueba con armas, sensis, cómo subir rango o problemas de rendimiento.',
]

/**
 * Responde una pregunta. Todo local, sin red.
 */
export function responder(pregunta: string, ultimoModelo?: string): Respuesta {
  const texto = normalizar(pregunta)
  const tokens = texto.split(' ').filter((t) => t.length > 2 && !VACIAS.has(t))

  // MEMORIA DEL TELEFONO.
  //
  // En una conversacion real nadie repite el modelo en cada mensaje: dice
  // "Samsung A54" y despues "¿y el boton?". Sin recordarlo, esa segunda
  // pregunta se quedaba sin dispositivo y caia en la respuesta generica, que
  // es justo donde el chat deja de parecer inteligente.
  const detectado = detectarModelo(pregunta)
  const dispositivo = detectado?.modelo ?? ultimoModelo ?? null
  const modeloDetectado = detectado?.modelo ?? ultimoModelo

  // 1. BOTON DE DISPARO. Va antes que la sensi porque es otra pregunta: el
  //    juego trae 50-60% para todos, y ese porcentaje da un boton fisico
  //    distinto en cada pantalla. Se calcula a partir de las pulgadas.
  // Sin doble comprobacion: `preguntaPorBoton` ya tolera erratas, y exigir
  // ademas la palabra bien escrita anulaba justo esa tolerancia ("botom"
  // pasaba el primer filtro y moria en el segundo).
  if (preguntaPorBoton(texto)) {
    if (dispositivo) {
      const { ficha } = fichaDe(dispositivo)
      return {
        texto: '',
        seguir: ['Dame mi sensibilidad completa', '¿Cómo mejoro mi puntería?'],
        fuente: 'boton',
        modeloDetectado,
        botones: {
          modelo: dispositivo,
          pulgadas: ficha.pulgadas,
          opciones: calcularTodos(ficha),
        },
      }
    }
    return {
      texto:
        'El botón de disparo viene al 50-60% para todo el mundo, y ahí está el ' +
        'problema: ese porcentaje se aplica sobre la pantalla, pero tu dedo mide ' +
        'lo mismo en un móvil de 6.1" que en uno de 6.8".\n\n' +
        'Dime tu modelo y te calculo el porcentaje que te deja el botón del ' +
        'tamaño físico correcto.',
      seguir: ['Redmi Note 12', 'iPhone 13', 'Samsung A54'],
      fuente: 'base',
      categoria: 'ajustes',
    }
  }

  // 2. Sensibilidad: la calcula el generador, no la base. Los numeros salen
  //    de las medidas del dispositivo, no de una respuesta escrita a mano.
  // Con erratas: 'sensivilidad', 'sencibilidad', 'configuracion' mal escrita.
  const pideSensi = contieneAlguna(texto,
    ['sensi', 'sensibilidad', 'config', 'configuracion', 'dpi', 'ajustes'])

  if (pideSensi || detectado) {
    if (dispositivo) {
      const r = generarSensi(dispositivo)
      return {
        texto: '',
        seguir: ['¿Cómo mejoro mi puntería?', '¿Qué tamaño de botón me conviene?'],
        fuente: 'sensi',
        sensi: r,
        modeloDetectado,
      }
    }
    return {
      texto:
        'Dime tu modelo de celular y te calculo la sensibilidad. Por ejemplo: ' +
        '"Redmi Note 12", "iPhone 13" o "Samsung A54". Los valores salen de la ' +
        'gama de tu equipo, no de una lista copiada.',
      seguir: ['Redmi Note 12', 'iPhone 13', 'Samsung A54'],
      fuente: 'base',
      categoria: 'ajustes',
    }
  }

  // 3. Base de conocimiento por relevancia.
  let mejor: Entrada | null = null
  let mejorPunt = 0
  for (const entrada of BASE) {
    const p = puntuar(entrada, tokens, texto)
    if (p > mejorPunt) {
      mejorPunt = p
      mejor = entrada
    }
  }

  // Umbral relativo: una frase larga necesita más que una coincidencia suelta.
  const minimo = tokens.length >= 5 ? 8 : 6
  if (mejor && mejorPunt >= minimo) {
    return {
      texto: elegir(mejor.respuestas),
      seguir: mejor.seguir ?? [],
      fuente: 'base',
      categoria: mejor.categoria,
    }
  }

  return {
    texto: elegir(MENSAJES_SIN_RESPUESTA),
    seguir: ['¿Cómo subo de rango?', 'Dame mi sensibilidad', '¿Mejor arma de cerca?'],
    fuente: 'sin_respuesta',
  }
}

function elegir<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)]
}

/** Cuántas respuestas distintas tiene la base, para poder decirlo sin mentir. */
export function tamanoBase(): { entradas: number; redacciones: number } {
  return {
    entradas: BASE.length,
    redacciones: BASE.reduce((n, e) => n + e.respuestas.length, 0),
  }
}
