/**
 * Fichas de armas de Free Fire.
 *
 * POR QUE FICHAS Y NO RESPUESTAS ESCRITAS
 * ---------------------------------------
 * Escribir a mano una respuesta por pregunta no escala: 28 armas dan 378
 * parejas solo para las comparaciones, y nadie escribe 378 párrafos sin
 * repetirse ni contradecirse. Peor: si mañana cambia el daño de la AK, hay que
 * encontrar y corregir todos los párrafos donde se mencionó.
 *
 * Con fichas, el dato vive en UN sitio y las respuestas se derivan. Cambias un
 * número y todas las comparaciones que lo usan quedan bien solas.
 *
 * LAS ESCALAS SON RELATIVAS, NO DEL JUEGO
 * ---------------------------------------
 * `dano`, `cadencia`, `alcance`, `estabilidad` y `movilidad` van de 0 a 100 y
 * comparan armas ENTRE SÍ, no reproducen los números internos de Garena —esos
 * no son públicos y cambian cada parche—. Sirven para decidir cuál gana en qué
 * situación, que es lo que se pregunta de verdad. Nadie pregunta "¿cuántos
 * puntos de daño hace la AK?"; preguntan "¿AK o M4?".
 */

export type TipoArma =
  | 'fusil' | 'subfusil' | 'escopeta' | 'francotirador'
  | 'tirador' | 'ametralladora' | 'pistola' | 'especial'

export interface Arma {
  id: string
  nombre: string
  tipo: TipoArma
  /** 0-100, relativos entre armas. */
  dano: number
  cadencia: number
  alcance: number
  estabilidad: number
  movilidad: number
  cargador: number
  /** Dónde aparece. 'suelo' | 'aerea' | 'tienda' */
  origen: 'suelo' | 'aerea' | 'tienda'
  /** Lo que hace distinta a esta arma en una frase. */
  rasgo: string
  /** Consejo de uso concreto. */
  consejo: string
  /** Accesorios que más le aportan, en orden. */
  accesorios: string[]
  /** Distancia donde brilla, en metros. */
  metros: [number, number]
}

export const ARMAS: Arma[] = [
  // ───────────────────────────────────────────── FUSILES
  { id: 'ak47', nombre: 'AK47', tipo: 'fusil', dano: 88, cadencia: 62, alcance: 70, estabilidad: 42, movilidad: 58, cargador: 30, origen: 'suelo',
    rasgo: 'el mayor daño por bala de los fusiles, a cambio del peor retroceso',
    consejo: 'Ráfagas de 4 o 5 balas y arrastra hacia abajo. Si mantienes apretado, las últimas se van al cielo.',
    accesorios: ['empuñadura', 'silenciador', 'culata'], metros: [15, 45] },
  { id: 'm4a1', nombre: 'M4A1', tipo: 'fusil', dano: 70, cadencia: 68, alcance: 72, estabilidad: 74, movilidad: 62, cargador: 30, origen: 'suelo',
    rasgo: 'el fusil más equilibrado y el más fácil de controlar',
    consejo: 'Aguanta ráfagas largas sin irse. Es la que más perdona si tu pulso no es fino.',
    accesorios: ['mira', 'empuñadura', 'cargador'], metros: [15, 55] },
  { id: 'scar', nombre: 'SCAR', tipo: 'fusil', dano: 78, cadencia: 64, alcance: 68, estabilidad: 62, movilidad: 60, cargador: 30, origen: 'suelo',
    rasgo: 'término medio entre la AK y la M4: pega fuerte sin castigar tanto',
    consejo: 'La opción segura cuando no sabes qué te vas a encontrar. Sirve en corta y en media.',
    accesorios: ['empuñadura', 'mira', 'silenciador'], metros: [12, 50] },
  { id: 'groza', nombre: 'GROZA', tipo: 'fusil', dano: 90, cadencia: 72, alcance: 74, estabilidad: 68, movilidad: 55, cargador: 30, origen: 'aerea',
    rasgo: 'el mejor fusil del juego, y por eso solo cae de cajas aéreas',
    consejo: 'Si la ves en una caja, deja lo que llevas. Gana a cualquier fusil del suelo en cualquier distancia.',
    accesorios: ['ya viene equipada'], metros: [10, 55] },
  { id: 'xm8', nombre: 'XM8', tipo: 'fusil', dano: 66, cadencia: 66, alcance: 76, estabilidad: 80, movilidad: 64, cargador: 30, origen: 'suelo',
    rasgo: 'el fusil más estable, con daño que no cae con la distancia',
    consejo: 'La mejor para pelear a media y larga sin sniper. Poco daño por bala, pero aciertas casi todas.',
    accesorios: ['mira', 'cargador'], metros: [25, 70] },
  { id: 'famas', nombre: 'FAMAS', tipo: 'fusil', dano: 74, cadencia: 60, alcance: 66, estabilidad: 58, movilidad: 60, cargador: 25, origen: 'suelo',
    rasgo: 'dispara en ráfagas de tres, muy fuerte si aciertas las tres',
    consejo: 'Apunta a la cabeza: si las tres balas entran arriba, tumba de una ráfaga.',
    accesorios: ['mira', 'empuñadura'], metros: [15, 45] },
  { id: 'an94', nombre: 'AN94', tipo: 'fusil', dano: 80, cadencia: 70, alcance: 70, estabilidad: 50, movilidad: 56, cargador: 32, origen: 'suelo',
    rasgo: 'cargador grande y mucha cadencia, con retroceso que sube rápido',
    consejo: 'Las primeras balas son precisísimas. Aprovecha eso: dispara corto y suelta.',
    accesorios: ['empuñadura', 'culata', 'cargador'], metros: [12, 45] },
  { id: 'aug', nombre: 'AUG', tipo: 'fusil', dano: 72, cadencia: 66, alcance: 74, estabilidad: 70, movilidad: 58, cargador: 30, origen: 'suelo',
    rasgo: 'trae mira incorporada y muy buena precisión a media',
    consejo: 'No necesita mira, así que ese hueco lo usas para otro accesorio.',
    accesorios: ['empuñadura', 'cargador'], metros: [20, 60] },
  { id: 'parafal', nombre: 'PARAFAL', tipo: 'fusil', dano: 86, cadencia: 52, alcance: 80, estabilidad: 56, movilidad: 52, cargador: 20, origen: 'suelo',
    rasgo: 'un fusil que pega como un tirador, lento pero durísimo',
    consejo: 'Trátala como semiautomática: un tiro, esperas a que se estabilice, otro tiro.',
    accesorios: ['mira', 'empuñadura'], metros: [30, 75] },
  { id: 'ac80', nombre: 'AC80', tipo: 'fusil', dano: 82, cadencia: 58, alcance: 72, estabilidad: 54, movilidad: 54, cargador: 25, origen: 'suelo',
    rasgo: 'pega fuerte y aguanta bien a media, pero pesa al moverse',
    consejo: 'Buena para aguantar una posición. Mala para rushear.',
    accesorios: ['empuñadura', 'mira'], metros: [20, 55] },

  // ───────────────────────────────────────────── SUBFUSILES
  { id: 'mp40', nombre: 'MP40', tipo: 'subfusil', dano: 52, cadencia: 96, alcance: 30, estabilidad: 40, movilidad: 88, cargador: 20, origen: 'suelo',
    rasgo: 'la cadencia más alta del juego',
    consejo: 'A menos de 10 metros gana casi cualquier duelo. A más de 15, cambia de arma.',
    accesorios: ['cargador', 'empuñadura'], metros: [0, 12] },
  { id: 'ump', nombre: 'UMP', tipo: 'subfusil', dano: 62, cadencia: 74, alcance: 46, estabilidad: 66, movilidad: 78, cargador: 25, origen: 'suelo',
    rasgo: 'el subfusil que atraviesa chaleco, castiga al que va bien equipado',
    consejo: 'Contra alguien con chaleco nivel 3 hace más daño real que casi cualquier subfusil.',
    accesorios: ['cargador', 'silenciador'], metros: [5, 25] },
  { id: 'mp5', nombre: 'MP5', tipo: 'subfusil', dano: 55, cadencia: 84, alcance: 38, estabilidad: 62, movilidad: 84, cargador: 30, origen: 'suelo',
    rasgo: 'equilibrio entre cadencia y control, con cargador amplio',
    consejo: 'Más fácil de llevar que la MP40 y aguanta un poco más de distancia.',
    accesorios: ['cargador', 'empuñadura'], metros: [3, 18] },
  { id: 'vector', nombre: 'VECTOR', tipo: 'subfusil', dano: 48, cadencia: 98, alcance: 28, estabilidad: 52, movilidad: 86, cargador: 20, origen: 'suelo',
    rasgo: 'se puede llevar en las dos manos, cadencia absurda y cargador que vuela',
    consejo: 'Con dos, el daño por segundo es el más alto del juego. Recarga antes de entrar.',
    accesorios: ['cargador', 'cargador'], metros: [0, 10] },
  { id: 'thompson', nombre: 'THOMPSON', tipo: 'subfusil', dano: 58, cadencia: 80, alcance: 34, estabilidad: 56, movilidad: 80, cargador: 30, origen: 'suelo',
    rasgo: 'cargador de 30 y buen daño, pensada para aguantar peleas seguidas',
    consejo: 'La que menos te obliga a recargar en medio de un tiroteo con varios.',
    accesorios: ['empuñadura', 'silenciador'], metros: [3, 20] },
  { id: 'mac10', nombre: 'MAC10', tipo: 'subfusil', dano: 46, cadencia: 94, alcance: 26, estabilidad: 38, movilidad: 90, cargador: 20, origen: 'suelo',
    rasgo: 'la más rápida al moverse, pero se vacía en un suspiro',
    consejo: 'Arma de principio de partida. En cuanto encuentres otra cosa, cámbiala.',
    accesorios: ['cargador'], metros: [0, 10] },
  { id: 'p90', nombre: 'P90', tipo: 'subfusil', dano: 54, cadencia: 88, alcance: 36, estabilidad: 60, movilidad: 82, cargador: 50, origen: 'suelo',
    rasgo: 'cargador de 50 balas, no hace falta recargar casi nunca',
    consejo: 'Ideal cuando peleas contra escuadra entera: aguanta cuatro duelos seguidos.',
    accesorios: ['empuñadura', 'silenciador'], metros: [3, 22] },

  // ───────────────────────────────────────────── ESCOPETAS
  { id: 'm1887', nombre: 'M1887', tipo: 'escopeta', dano: 98, cadencia: 22, alcance: 14, estabilidad: 30, movilidad: 66, cargador: 2, origen: 'suelo',
    rasgo: 'mata de uno o dos tiros a quemarropa, y solo tiene dos cartuchos',
    consejo: 'Dispara los dos y CAMBIA de arma. Recargar delante del enemigo es como te matan.',
    accesorios: ['no admite casi nada'], metros: [0, 7] },
  { id: 'm1014', nombre: 'M1014', tipo: 'escopeta', dano: 78, cadencia: 40, alcance: 16, estabilidad: 44, movilidad: 62, cargador: 5, origen: 'suelo',
    rasgo: 'cinco cartuchos seguidos, perdona fallar',
    consejo: 'Menos daño por tiro que la M1887, pero puedes fallar dos veces y seguir vivo.',
    accesorios: ['choke', 'culata'], metros: [0, 9] },
  { id: 'spas12', nombre: 'SPAS12', tipo: 'escopeta', dano: 84, cadencia: 34, alcance: 18, estabilidad: 46, movilidad: 60, cargador: 6, origen: 'suelo',
    rasgo: 'la escopeta con más alcance útil',
    consejo: 'Aguanta duelos a 10-12 metros donde las otras escopetas ya no llegan.',
    accesorios: ['choke', 'culata'], metros: [0, 12] },
  { id: 'mag7', nombre: 'MAG-7', tipo: 'escopeta', dano: 74, cadencia: 52, alcance: 12, estabilidad: 50, movilidad: 74, cargador: 5, origen: 'suelo',
    rasgo: 'la escopeta más rápida entre tiro y tiro',
    consejo: 'Se comporta casi como un subfusil pegado. Muy buena entrando a casas.',
    accesorios: ['choke'], metros: [0, 6] },

  // ───────────────────────────────────────────── FRANCOTIRADORES
  { id: 'awm', nombre: 'AWM', tipo: 'francotirador', dano: 100, cadencia: 12, alcance: 100, estabilidad: 90, movilidad: 30, cargador: 5, origen: 'aerea',
    rasgo: 'la única que mata de un headshot aunque lleven casco nivel 3',
    consejo: 'Apunta algo por encima si está lejos: la bala cae. Y no la uses en corta, el zoom te ciega.',
    accesorios: ['ya viene equipada'], metros: [80, 300] },
  { id: 'kar98k', nombre: 'KAR98K', tipo: 'francotirador', dano: 94, cadencia: 16, alcance: 92, estabilidad: 84, movilidad: 38, cargador: 5, origen: 'suelo',
    rasgo: 'el sniper del suelo, mata de un headshot hasta casco nivel 2',
    consejo: 'Dispara y muévete. El destello delata tu posición a todo el que mire hacia ahí.',
    accesorios: ['mira 4x', 'mira 8x'], metros: [60, 250] },
  { id: 'm82b', nombre: 'M82B', tipo: 'francotirador', dano: 96, cadencia: 20, alcance: 95, estabilidad: 82, movilidad: 34, cargador: 8, origen: 'aerea',
    rasgo: 'atraviesa gloo walls y hace daño extra a los que están dentro',
    consejo: 'Es la respuesta a los que se esconden tras muro. Dispárale al muro, no al lado.',
    accesorios: ['ya viene equipada'], metros: [60, 250] },

  // ───────────────────────────────────────────── TIRADORES
  { id: 'sks', nombre: 'SKS', tipo: 'tirador', dano: 80, cadencia: 44, alcance: 82, estabilidad: 64, movilidad: 50, cargador: 10, origen: 'suelo',
    rasgo: 'semiautomática de media-larga, buen puente entre fusil y sniper',
    consejo: 'Toca disparar rítmico, no a lo loco: cada tiro necesita que la mira vuelva.',
    accesorios: ['mira 4x', 'empuñadura'], metros: [40, 110] },
  { id: 'm14', nombre: 'M14', tipo: 'tirador', dano: 76, cadencia: 48, alcance: 86, estabilidad: 60, movilidad: 48, cargador: 20, origen: 'suelo',
    rasgo: 'cargador de 20 y mucho alcance, castiga a los que cruzan campo abierto',
    consejo: 'Con mira 4x aguanta duelos donde el fusil ya no llega.',
    accesorios: ['mira 4x', 'cargador'], metros: [45, 120] },
  { id: 'woodpecker', nombre: 'WOODPECKER', tipo: 'tirador', dano: 84, cadencia: 40, alcance: 84, estabilidad: 66, movilidad: 46, cargador: 15, origen: 'suelo',
    rasgo: 'atraviesa chalecos: cuanto mejor equipado va el rival, más se nota',
    consejo: 'La que quieres en partidas avanzadas, cuando todos llevan nivel 3.',
    accesorios: ['mira 4x'], metros: [40, 110] },

  // ───────────────────────────────────────────── OTRAS
  { id: 'm60', nombre: 'M60', tipo: 'ametralladora', dano: 70, cadencia: 76, alcance: 60, estabilidad: 44, movilidad: 34, cargador: 100, origen: 'suelo',
    rasgo: 'cien balas sin recargar, para aguantar posiciones',
    consejo: 'Te frena mucho al moverte. Úsala parado y con cobertura, nunca corriendo.',
    accesorios: ['empuñadura'], metros: [10, 50] },
  { id: 'gatling', nombre: 'GATLING', tipo: 'ametralladora', dano: 74, cadencia: 92, alcance: 55, estabilidad: 36, movilidad: 20, cargador: 200, origen: 'aerea',
    rasgo: 'tarda en arrancar y luego no para de escupir',
    consejo: 'Empieza a girarla ANTES de asomar, o el primer segundo te lo comes sin disparar.',
    accesorios: ['ya viene equipada'], metros: [5, 40] },
  { id: 'desert_eagle', nombre: 'DESERT EAGLE', tipo: 'pistola', dano: 82, cadencia: 38, alcance: 48, estabilidad: 48, movilidad: 76, cargador: 7, origen: 'suelo',
    rasgo: 'la pistola que pega como un fusil',
    consejo: 'Sirve de arma secundaria de verdad, no de relleno. Al principio de partida es letal.',
    accesorios: ['mira roja'], metros: [5, 30] },
  { id: 'm500', nombre: 'M500', tipo: 'pistola', dano: 88, cadencia: 26, alcance: 44, estabilidad: 52, movilidad: 78, cargador: 6, origen: 'suelo',
    rasgo: 'revólver que casi tumba de dos tiros al cuerpo',
    consejo: 'Seis balas y recarga lenta. Cada tiro tiene que contar.',
    accesorios: ['ninguno'], metros: [5, 25] },
  { id: 'm79', nombre: 'M79', tipo: 'especial', dano: 92, cadencia: 18, alcance: 40, estabilidad: 40, movilidad: 70, cargador: 1, origen: 'suelo',
    rasgo: 'lanzagranadas: rompe gloo walls y saca a los que campean',
    consejo: 'Apunta al suelo delante del muro, no al muro. El área hace el resto.',
    accesorios: ['ninguno'], metros: [10, 45] },
  { id: 'treatment_gun', nombre: 'TREATMENT GUN', tipo: 'especial', dano: 0, cadencia: 60, alcance: 30, estabilidad: 100, movilidad: 72, cargador: 40, origen: 'suelo',
    rasgo: 'cura a tus compañeros a distancia, no hace daño',
    consejo: 'En escuadra vale más que un arma: mantiene vivo al que está peleando delante.',
    accesorios: ['ninguno'], metros: [0, 25] },
]

export const POR_ID: Record<string, Arma> = Object.fromEntries(ARMAS.map((a) => [a.id, a]))

/** Nombre del tipo, en singular y legible. */
export const NOMBRE_TIPO: Record<TipoArma, string> = {
  fusil: 'fusil', subfusil: 'subfusil', escopeta: 'escopeta',
  francotirador: 'francotirador', tirador: 'fusil de tirador',
  ametralladora: 'ametralladora', pistola: 'pistola', especial: 'arma especial',
}
