/**
 * Comparacion de texto TOLERANTE A ERRATAS.
 *
 * La gente escribe desde el movil, deprisa y con el pulgar: "botom" por
 * "boton", "sensivilidad", "punteria" sin tilde, "grafico" en singular. Un
 * motor que exige la palabra exacta falla justo con quien mas ayuda necesita.
 *
 * Se resolvio con distancia de edicion y no con una lista de erratas porque
 * una lista solo cubre las que a uno se le ocurren; la distancia cubre las que
 * no. "botom", "voton", "botonn" y "bton" caen todas a "boton" sin haberlas
 * previsto.
 */

/** Quita tildes, signos y pasa a minusculas. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Distancia de edicion (Levenshtein) con corte temprano.
 *
 * El corte importa: sin el, comparar cada palabra de la pregunta contra cada
 * clave de la base seria caro. Con el, en cuanto la fila entera supera el
 * maximo tolerado se abandona.
 */
export function distancia(a: string, b: string, maximo = 2): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > maximo) return maximo + 1

  let previa = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const actual = [i]
    let mejorFila = i
    for (let j = 1; j <= b.length; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1
      const v = Math.min(
        previa[j] + 1,        // borrar
        actual[j - 1] + 1,    // insertar
        previa[j - 1] + coste // sustituir
      )
      actual.push(v)
      if (v < mejorFila) mejorFila = v
    }
    if (mejorFila > maximo) return maximo + 1
    previa = actual
  }
  return previa[b.length]
}

/**
 * Cuantas erratas se toleran segun el largo de la palabra.
 *
 * En palabras cortas una sola letra cambia el significado ("mas" y "mis"), asi
 * que ahi se exige exactitud. Cuanto mas larga, mas margen: en "sensibilidad"
 * dos letras mal siguen dejando claro que quiso decir.
 */
function tolerancia(palabra: string): number {
  if (palabra.length <= 4) return 0
  if (palabra.length <= 7) return 1
  return 2
}

/** True si `palabra` es esa `clave` o una version con erratas. */
export function pareceMisma(palabra: string, clave: string): boolean {
  if (palabra === clave) return true
  const tol = tolerancia(clave)
  if (tol === 0) return false
  return distancia(palabra, clave, tol) <= tol
}

/**
 * True si alguna palabra del texto casa (con erratas) con alguna de las claves.
 * Tambien acepta la clave como subcadena, para "graficos" dentro de "losgraficos".
 */
export function contieneAlguna(texto: string, claves: string[]): boolean {
  const palabras = texto.split(' ')
  for (const clave of claves) {
    const c = normalizar(clave)
    if (!c) continue
    if (texto.includes(c)) return true
    if (palabras.some((p) => pareceMisma(p, c))) return true
  }
  return false
}

/**
 * True si TODAS las palabras con peso de una frase clave estan en el texto,
 * aunque haya otras en medio y aunque vengan con erratas.
 *
 * Hace falta porque nadie escribe la frase clave literal: la clave es
 * "se calienta" y el usuario escribe "se me calienta el celular".
 */
export function contieneFrase(texto: string, frase: string, vacias: Set<string>): boolean {
  const palabras = texto.split(' ')
  const conPeso = normalizar(frase)
    .split(' ')
    .filter((w) => w.length > 2 && !vacias.has(w))
  if (conPeso.length === 0) return false
  return conPeso.every(
    (w) => texto.includes(w) || palabras.some((p) => pareceMisma(p, w))
  )
}
