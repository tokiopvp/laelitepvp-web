/**
 * Genera entradas de la base cruzando las fichas de armas.
 *
 * POR QUE GENERAR Y NO ESCRIBIR
 * -----------------------------
 * 33 armas dan 528 parejas solo para las comparaciones. Escribir 528 párrafos
 * a mano acaba en repetición y contradicciones, y cuando cambie el daño de un
 * arma habría que encontrar todos los sitios donde se mencionó.
 *
 * Aquí el dato vive en la ficha y la redacción se deriva. Cambias un número y
 * todas las respuestas que dependen de él quedan bien solas.
 *
 * NO SON PLANTILLAS RELLENADAS
 * ----------------------------
 * Una plantilla dice lo mismo siempre con los nombres cambiados. Esto COMPARA:
 * mira la diferencia real entre las dos fichas y redacta según de dónde venga
 * la ventaja. "AK47 o M4A1" no da el mismo texto que "AWM o MP40" porque la
 * primera es una decisión de pulso y la segunda ni siquiera es una decisión.
 *
 * Y la conclusión sale de los números, así que no puede contradecir a la ficha.
 */
import type { Entrada } from './base'
import { ARMAS, NOMBRE_TIPO, type Arma } from './datos/armas'

/** Etiqueta legible de una distancia en metros. */
function franja(m: [number, number]): string {
  if (m[1] <= 12) return 'pegado'
  if (m[1] <= 30) return 'corta distancia'
  if (m[1] <= 60) return 'media distancia'
  if (m[1] <= 130) return 'larga distancia'
  return 'muy larga distancia'
}

/** Une con comas y una "y" final, como se escribe de verdad. */
function lista(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? ''
  return xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1]
}

// ─────────────────────────────────────────── una ficha por arma
function fichaDeArma(a: Arma): Entrada {
  const donde =
    a.origen === 'aerea' ? 'Solo cae de cajas aéreas.'
    : a.origen === 'tienda' ? 'Se consigue en la tienda.'
    : 'Se encuentra por el mapa.'

  const acc = a.accesorios[0]?.startsWith('ya viene') || a.accesorios[0] === 'ninguno'
    ? ''
    : ` Lo que más le aporta: ${lista(a.accesorios)}.`

  return {
    id: `arma_${a.id}`,
    categoria: 'armas',
    claves: [a.id.replace(/_/g, ' '), a.nombre.toLowerCase()],
    apoyo: [NOMBRE_TIPO[a.tipo], franja(a.metros)],
    respuestas: [
      `${a.nombre}: ${a.rasgo}. ${a.consejo} Su terreno son los ${a.metros[0]}-${a.metros[1]} metros. ${donde}${acc}`,
      `La ${a.nombre} destaca por ${a.rasgo}. Va bien entre ${a.metros[0]} y ${a.metros[1]} metros. ${a.consejo}`,
      `${a.nombre} — ${NOMBRE_TIPO[a.tipo]}, cargador de ${a.cargador}. ${a.rasgo[0].toUpperCase()}${a.rasgo.slice(1)}. ${a.consejo}`,
    ],
    seguir: [`¿Sensi para la ${a.nombre}?`, `¿Con qué combino la ${a.nombre}?`],
  }
}

// ─────────────────────────────────────────── comparaciones dos a dos
/**
 * Compara dos armas y explica de dónde sale la ventaja.
 *
 * La clave es que no siempre hay una ganadora. Cuando una gana en daño y la
 * otra en control, la respuesta honesta es "depende de tu pulso", y decir eso
 * vale más que inventar un veredicto.
 */
function comparar(a: Arma, b: Arma): Entrada | null {
  // Comparar una escopeta con un sniper no es una pregunta real.
  const distintos = Math.abs(a.alcance - b.alcance) > 45
  const dDano = a.dano - b.dano
  const dEstab = a.estabilidad - b.estabilidad
  const dCad = a.cadencia - b.cadencia
  const dAlc = a.alcance - b.alcance
  // Nota global: pesa las cuatro medidas juntas. Sirve para cazar los casos en
  // que una arma gana en todo por poco, que mirando diferencia a diferencia
  // parecerian un empate.
  const nota = (x: Arma) => x.dano * 0.35 + x.estabilidad * 0.25 + x.cadencia * 0.2 + x.alcance * 0.2
  const dTotal = nota(a) - nota(b)

  let veredicto: string

  if (distintos) {
    const cerca = a.alcance < b.alcance ? a : b
    const lejos = a.alcance < b.alcance ? b : a
    veredicto =
      `No compiten: son para momentos distintos. La ${cerca.nombre} manda ${franja(cerca.metros)} ` +
      `(${cerca.metros[0]}-${cerca.metros[1]} m) y la ${lejos.nombre} a ${franja(lejos.metros)} ` +
      `(${lejos.metros[0]}-${lejos.metros[1]} m). Lo normal es llevar una de cada, no elegir.`
  } else if (Math.abs(dDano) >= 10 && Math.abs(dEstab) >= 10 && Math.sign(dDano) !== Math.sign(dEstab)) {
    const fuerte = dDano > 0 ? a : b
    const facil = dDano > 0 ? b : a
    veredicto =
      `Depende de tu pulso. La ${fuerte.nombre} pega más por bala pero castiga el error; ` +
      `la ${facil.nombre} hace menos daño y es bastante más fácil de controlar, así que aciertas más. ` +
      `Si te tiembla el arrastre, la ${facil.nombre} te da más kills reales aunque el papel diga otra cosa.`
  } else if (Math.abs(dDano) >= 12) {
    const g = dDano > 0 ? a : b
    const p = dDano > 0 ? b : a
    veredicto =
      `Gana la ${g.nombre}: pega bastante más por bala y no cede nada importante a cambio. ` +
      `La ${p.nombre} solo la supera si te encuentras justo en su terreno (${p.metros[0]}-${p.metros[1]} m).`
  } else if (Math.abs(dCad) >= 15) {
    const r = dCad > 0 ? a : b
    const l = dCad > 0 ? b : a
    veredicto =
      `Muy parejas en daño, así que decide la cadencia: la ${r.nombre} dispara bastante más rápido ` +
      `y gana los duelos pegados. La ${l.nombre} compensa si sabes acertar a la primera.`
  } else if (Math.abs(dTotal) >= 7) {
    // DOMINANCIA. Sin esta rama, "AK47 o GROZA" caia en el empate y respondia
    // "estan tan igualadas que es de gusto", cuando la GROZA gana en las
    // cuatro medidas. Cada diferencia por separado quedaba bajo su umbral;
    // sumadas, no. Comparar de una en una pierde justo el caso mas claro.
    const g = dTotal > 0 ? a : b
    const p = dTotal > 0 ? b : a
    const gana: string[] = []
    if (g.dano - p.dano >= 4) gana.push('pega más')
    if (g.cadencia - p.cadencia >= 6) gana.push('dispara más rápido')
    if (g.estabilidad - p.estabilidad >= 6) gana.push('se controla mejor')
    if (g.alcance - p.alcance >= 6) gana.push('llega más lejos')
    veredicto =
      `La ${g.nombre}, sin discusión: ${gana.length ? lista(gana) : 'gana en casi todo'}. ` +
      `La ${p.nombre} no hace nada mejor que ella` +
      `${g.origen === 'aerea' ? `, pero la ${g.nombre} solo cae de cajas aéreas: mientras no aparezca, la ${p.nombre} es lo que hay.` : '. Cambia en cuanto puedas.'}`
  } else if (Math.abs(dAlc) >= 12) {
    const g = dAlc > 0 ? a : b
    const p = dAlc > 0 ? b : a
    veredicto =
      `Casi iguales de cerca. La diferencia está lejos: la ${g.nombre} mantiene el daño donde ` +
      `la ${p.nombre} ya no llega. Si peleas en abierto, la ${g.nombre}.`
  } else {
    const g = a.estabilidad >= b.estabilidad ? a : b
    veredicto =
      `Están tan igualadas que la elección es de gusto. Sobre el papel la ${g.nombre} es algo más ` +
      `estable, pero la diferencia real la pone quien dispara. Quédate con la que te resulte cómoda.`
  }

  const n1 = a.nombre.toLowerCase()
  const n2 = b.nombre.toLowerCase()

  return {
    id: `vs_${a.id}_${b.id}`,
    categoria: 'armas',
    claves: [`${n1} o ${n2}`, `${n2} o ${n1}`, `${n1} vs ${n2}`, `${n2} vs ${n1}`],
    apoyo: ['mejor', 'cual'],
    respuestas: [
      veredicto,
      `${a.nombre} vs ${b.nombre}. ${a.nombre}: ${a.rasgo}. ${b.nombre}: ${b.rasgo}. ${veredicto}`,
    ],
    seguir: [`Sensi para la ${a.nombre}`, `Mejor arma a ${franja(a.metros)}`],
  }
}

// ─────────────────────────────────────────── mejor arma por situación
function mejoresPor(
  id: string,
  claves: string[],
  titulo: string,
  filtro: (a: Arma) => boolean,
  puntua: (a: Arma) => number,
): Entrada {
  const top = ARMAS.filter(filtro).sort((x, y) => puntua(y) - puntua(x)).slice(0, 3)
  if (top.length === 0) {
    return { id, categoria: 'armas', claves, respuestas: ['No tengo nada claro para eso todavía.'] }
  }
  const [p, s, t] = top
  const cola = t ? ` Y si no aparecen, la ${t.nombre} cumple.` : ''
  return {
    id,
    categoria: 'armas',
    claves,
    apoyo: ['mejor', 'arma', 'recomiendas'],
    respuestas: [
      `${titulo}: la ${p.nombre}. ${p.rasgo[0].toUpperCase()}${p.rasgo.slice(1)}. ` +
        `${p.consejo}${s ? ` La alternativa es la ${s.nombre}: ${s.rasgo}.` : ''}${cola}`,
      `${titulo}, por orden: ${lista(top.map((a) => a.nombre))}. ` +
        `La ${p.nombre} va primera por esto: ${p.rasgo}.`,
    ],
    seguir: [`Sensi para la ${p.nombre}`, `¿${p.nombre} o ${s?.nombre ?? 'otra'}?`],
  }
}

// ─────────────────────────────────────────── accesorios y cargadores
function accesoriosDe(a: Arma): Entrada | null {
  if (a.accesorios[0]?.startsWith('ya viene') || a.accesorios[0] === 'ninguno' || a.accesorios[0]?.startsWith('no admite')) return null
  return {
    id: `acc_${a.id}`,
    categoria: 'armas',
    claves: [`accesorios ${a.nombre.toLowerCase()}`, `mira para ${a.nombre.toLowerCase()}`, `equipar ${a.nombre.toLowerCase()}`],
    apoyo: ['accesorio', 'attachment', 'equipar'],
    respuestas: [
      `Para la ${a.nombre}, por orden de importancia: ${lista(a.accesorios)}. ` +
        `${a.estabilidad < 55 ? 'Prioriza todo lo que reduzca retroceso: es su punto débil.' : 'Es estable de serie, así que puedes gastar huecos en cargador o mira.'}`,
      `${a.nombre}: ${lista(a.accesorios)}. ${a.consejo}`,
    ],
  }
}

/**
 * Toda la base derivada de las fichas.
 *
 * Se calcula una vez al cargar el módulo, no en cada pregunta: son cientos de
 * entradas y recalcularlas en cada mensaje se notaría en móviles lentos.
 */
export function generarEntradasArmas(): Entrada[] {
  const out: Entrada[] = []

  for (const a of ARMAS) {
    out.push(fichaDeArma(a))
    const acc = accesoriosDe(a)
    if (acc) out.push(acc)
  }

  // Todas las parejas, una sola vez cada una.
  for (let i = 0; i < ARMAS.length; i++) {
    for (let j = i + 1; j < ARMAS.length; j++) {
      const e = comparar(ARMAS[i], ARMAS[j])
      if (e) out.push(e)
    }
  }

  // Preguntas de "cuál es la mejor para X".
  out.push(
    // Solo armas del suelo y que no frenen: quien pregunta como rushear
    // necesita algo que vaya a encontrar y que le deje moverse.
    mejoresPor('mejor_pegado', ['mejor arma pegado', 'mejor arma cerca', 'arma para rushear', 'combate cerrado', 'corta distancia'],
      'Para pelear pegado',
      (a) => a.metros[0] <= 5 && a.dano > 40 && a.origen === 'suelo' && a.movilidad >= 60,
      (a) => a.cadencia * 0.5 + a.dano * 0.3 + a.movilidad * 0.2),
    mejoresPor('mejor_media', ['mejor arma media distancia', 'arma para media', 'arma media'],
      'A media distancia', (a) => a.metros[1] >= 40 && a.metros[1] <= 80, (a) => a.dano * 0.5 + a.estabilidad * 0.5),
    mejoresPor('mejor_larga', ['mejor arma larga distancia', 'mejor sniper', 'mejor francotirador', 'arma para lejos'],
      'A larga distancia', (a) => a.alcance >= 80, (a) => a.dano * 0.6 + a.alcance * 0.4),
    mejoresPor('mejor_fusil', ['mejor fusil', 'mejor rifle', 'que fusil uso'],
      'El mejor fusil', (a) => a.tipo === 'fusil', (a) => a.dano * 0.45 + a.estabilidad * 0.35 + a.alcance * 0.2),
    mejoresPor('mejor_subfusil', ['mejor subfusil', 'mejor smg', 'que subfusil uso'],
      'El mejor subfusil', (a) => a.tipo === 'subfusil', (a) => a.cadencia * 0.5 + a.dano * 0.3 + a.movilidad * 0.2),
    mejoresPor('mejor_escopeta', ['mejor escopeta', 'que escopeta uso'],
      'La mejor escopeta', (a) => a.tipo === 'escopeta', (a) => a.dano * 0.6 + a.cadencia * 0.4),
    mejoresPor('mejor_movilidad', ['arma para moverse', 'arma rapida', 'arma que no frene', 'arma ligera'],
      'Si quieres moverte rápido', (a) => a.dano > 40 && a.origen === 'suelo', (a) => a.movilidad),
    mejoresPor('mejor_estable', ['arma sin retroceso', 'arma facil de controlar', 'arma estable', 'arma para principiante'],
      'Lo más fácil de controlar', (a) => a.dano > 45 && a.origen === 'suelo', (a) => a.estabilidad),
    mejoresPor('mejor_cargador', ['arma con mas balas', 'arma cargador grande', 'arma que no se acabe'],
      'Si no quieres recargar', (a) => a.dano > 40 && a.origen === 'suelo', (a) => a.cargador),
    mejoresPor('mejor_caja', ['armas de caja aerea', 'mejor arma de caja', 'que sale en las cajas'],
      'De las cajas aéreas', (a) => a.origen === 'aerea', (a) => a.dano),
  )

  return out
}
