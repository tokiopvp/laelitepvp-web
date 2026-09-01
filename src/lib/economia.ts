/**
 * Elite Coin: tareas, tienda de canjes y mercado.
 *
 * REGLA QUE ORDENA TODO ESTE ARCHIVO
 * ----------------------------------
 * El navegador solo LEE y PIDE. Nunca decide cuántas coins vale algo ni cambia
 * un saldo: todo eso son funciones `SECURITY DEFINER` en Postgres
 * (`claim_task`, `redeem_item`, `house_trade`). Si el precio o la recompensa se
 * calcularan aquí, cualquiera con la consola del navegador abierta se pondría
 * un millón de coins en dos líneas y la economía se acabaría el primer día.
 *
 * Lo de aquí, por tanto, es presentación y llamadas.
 */

import { supabaseBrowser } from './supabase/client'

function client() {
  try {
    return supabaseBrowser()
  } catch {
    return null
  }
}

// ------------------------------------------------------------
// Tipos
// ------------------------------------------------------------

export type Periodo = 'diaria' | 'semanal' | 'unica'
export type Rareza = 'basura' | 'normal' | 'epico' | 'legendario'

export interface Tarea {
  id: string
  titulo: string
  descripcion: string | null
  metrica: string
  objetivo: number
  coins: number
  periodo: Periodo
  publico: 'clan' | 'todos' | 'booster'
  nivel: number
  icono: string | null
  activa: boolean
  orden: number
}

export interface ItemTienda {
  id: string
  nombre: string
  descripcion: string | null
  precio_coins: number
  diamantes: number | null
  valor_usd: number | null
  imagen_url: string | null
  rareza: Rareza
  stock: number
  limite_dia: number
  solo_clan: boolean
  activo: boolean
  orden: number
}

export interface Vela {
  bucket: string
  open: number
  high: number
  low: number
  close: number
  volumen: number
}

export interface Operacion {
  id: number
  lado: 'compra' | 'venta'
  actor: string
  coins: number
  precio: number
  tamano: number
  created_at: string
}

export interface Casa {
  nombre: string
  avatar_url: string | null
  coins: number
  /**
   * Si sale en el ranking publico.
   *
   * No apaga la cuenta: sigue moviendo el mercado igual. Solo decide si el
   * ranking enseña el techo o no. Puede llegar sin valor de una fila creada
   * antes de la columna, y en ese caso se asume que si.
   */
  visible_top?: boolean
}

export interface Progreso {
  task_id: string
  progreso: number
  objetivo: number
  cobrada: boolean
  /**
   * Lo que cobra ESTA persona, no lo que dice la tabla.
   *
   * Un no miembro cobra el 45% y un booster el doble. Enseñar la cifra de la
   * tabla y pagar otra distinta es la peor forma de fallar: parece un engaño.
   * Puede venir sin valor en respuestas viejas, de ahi el opcional.
   */
  coins?: number
}

/**
 * El saldo de honor y a cuanto se cambia AHORA MISMO.
 *
 * `tasa_efectiva` ya lleva aplicado el bonus de racha. Se manda resuelto desde
 * Postgres a proposito: si el navegador multiplicara por su cuenta, bastaria
 * con que el bonus cambiara para que la pagina prometiera una cifra y el boton
 * pagara otra.
 */
export interface Honor {
  disponible: number
  ganado_total: number
  canjeado_total: number
  racha: number
  bonus: number
  /**
   * Los bonus SUMAN, no multiplican: 1 + racha(0..0,5) + booster(0 o 0,5).
   * Multiplicandolos, un booster con racha maxima sacaria 100 -> 225 y
   * "100 de honor son 150" dejaria de ser cierto. Sumando, el techo es el
   * doble y se entiende de un vistazo.
   */
  bonus_booster?: number
  es_booster?: boolean
  tasa: number
  tasa_efectiva: number
  min_canje: number
}

export async function getHonor(): Promise<Honor | null> {
  const sb = client()
  if (!sb) return null
  const { data, error } = await sb.rpc('mi_honor')
  if (error || !data) return null
  return data as Honor
}

export async function cambiarHonor(honor: number): Promise<Resultado> {
  const sb = client()
  if (!sb) return { ok: false, error: 'Sin conexión' }
  const { data, error } = await sb.rpc('canjear_honor', { p_honor: honor })
  if (error) return { ok: false, error: error.message }
  return data as Resultado
}

export interface FilaTop {
  id: string
  nombre: string
  coins: number
  avatar_url: string | null
  es_miembro: boolean
  es_casa: boolean
}

// ------------------------------------------------------------
// Lecturas
// ------------------------------------------------------------

export async function getTareas(): Promise<Tarea[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('tasks')
    .select('*')
    .eq('activa', true)
    .order('orden')
  if (error || !data) return []
  return data as Tarea[]
}

/**
 * Progreso del usuario en cada tarea, resuelto por el servidor.
 *
 * Una sola llamada para las veinte tareas, y con la MISMA lógica que usa
 * `claim_task` para pagar. Si la barra y el cobro se calcularan por separado
 * acabarían discrepando, y una barra al 100% que al pulsar dice "todavía no
 * llegas" destruye la confianza en toda la página.
 */
export async function getProgreso(): Promise<Map<string, Progreso>> {
  const sb = client()
  if (!sb) return new Map()
  const { data, error } = await sb.rpc('my_task_progress')
  if (error || !Array.isArray(data)) return new Map()
  return new Map(
    (data as any[]).map((p) => [
      p.task_id,
      {
        task_id: p.task_id,
        progreso: Number(p.progreso) || 0,
        objetivo: Number(p.objetivo) || 1,
        cobrada: !!p.cobrada,
      },
    ])
  )
}

export async function getTienda(): Promise<ItemTienda[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('shop_items')
    .select('*')
    .eq('activo', true)
    .order('orden')
  if (error || !data) return []
  return data as ItemTienda[]
}

export async function getCasa(): Promise<Casa | null> {
  const sb = client()
  if (!sb) return null
  const { data } = await sb
    .from('house_account')
    .select('nombre, avatar_url, coins, visible_top')
    .eq('id', 1)
    .maybeSingle()
  return (data as Casa) ?? null
}

/**
 * El ranking, con la cuenta grande insertada en su sitio.
 *
 * Esa cuenta no está en `profiles` (no tiene login detrás), así que se mezcla
 * aquí y se reordena por saldo. Va primero porque tiene el saldo más alto, no
 * porque se le haya clavado el puesto 1: si alguien lo superase de verdad, la
 * lista lo reflejaría.
 *
 * Sale etiquetada como un miembro más de la comunidad, no como "la casa": que
 * el número uno y quien mueve el mercado sean la misma mano es justo lo que no
 * debe deducirse mirando la tabla.
 */
/**
 * Nombre que se puede enseñar en público.
 *
 * El respaldo de `username` existe para quien no tiene nombre visible, pero
 * históricamente ese campo llegó a contener el CORREO de la persona: el
 * disparador de registro lo usaba como último recurso. Se limpió en la base,
 * y esto es el cinturón por si alguna vía futura vuelve a colar uno.
 *
 * Ante la duda se recorta por la arroba en vez de ocultar el nombre entero:
 * "juanito" identifica a alguien en un ranking; "Jugador" repetido veinte veces
 * no sirve de nada.
 */
function nombrePublico(p: { display_name?: string | null; username?: string | null }): string {
  const visible = (p.display_name || '').trim()
  if (visible && !visible.includes('@')) return visible
  const usuario = (p.username || '').trim()
  if (!usuario) return 'Jugador'
  return usuario.includes('@') ? usuario.split('@')[0] : usuario
}

export async function getTop(limite = 50): Promise<FilaTop[]> {
  const sb = client()
  if (!sb) return []
  const [{ data: perfiles }, casa] = await Promise.all([
    sb
      .from('profiles')
      .select('id, display_name, username, points, avatar_url, is_member')
      .order('points', { ascending: false })
      .limit(limite),
    getCasa(),
  ])

  const filas: FilaTop[] = (perfiles ?? []).map((p: any) => ({
    id: p.id,
    nombre: nombrePublico(p),
    coins: p.points ?? 0,
    avatar_url: p.avatar_url ?? null,
    es_miembro: !!p.is_member,
    es_casa: false,
  }))

  // `visible_top === false` la saca del ranking. Se comprueba asi y no con un
  // `if (casa.visible_top)` porque una fila anterior a la columna llega sin el
  // campo, y eso no puede significar "ocultala".
  if (casa && casa.visible_top !== false) {
    filas.push({
      id: 'casa',
      nombre: casa.nombre,
      coins: casa.coins,
      avatar_url: casa.avatar_url,
      // Se presenta como comunidad, igual que cualquier otro: marcarla como
      // miembro del clan la señalaría, y la gracia es que no destaque por nada
      // salvo por su saldo.
      es_miembro: false,
      es_casa: true,
    })
  }
  return filas.sort((a, b) => b.coins - a.coins).slice(0, limite)
}

/**
 * Serie del gráfico para un marco de tiempo.
 *
 * `market_series` agrupa en el SERVIDOR a ~120 puntos. El marco "SEMANA" son
 * 10.080 velas de un minuto: mandarlas enteras al móvil de alguien con datos
 * para pintar 120 columnas es tirar megabytes. Así cada marco pesa lo mismo.
 *
 * Antes se llama a `market_tick()`, que cierra las velas pendientes desde la
 * última visita. Es idempotente, así que da igual que entren cien personas a
 * la vez: el mercado sigue vivo sin depender de ningún cron.
 */
export async function getVelas(minutos: number, puntos = 120): Promise<Vela[]> {
  const sb = client()
  if (!sb) return []
  try {
    await sb.rpc('market_tick')
  } catch {
    /* si el tick falla, se pinta lo que ya hubiera */
  }
  const { data, error } = await sb.rpc('market_series', {
    p_minutos: minutos,
    p_puntos: puntos,
  })
  if (error || !Array.isArray(data)) return []
  return (data as any[]).map(normalizarVela)
}

function normalizarVela(v: any): Vela {
  // Postgres devuelve `numeric` como texto para no perder precisión; sin este
  // paso las comparaciones del gráfico serían alfabéticas ("9" > "10").
  return {
    bucket: v.bucket,
    open: Number(v.open),
    high: Number(v.high),
    low: Number(v.low),
    close: Number(v.close),
    volumen: Number(v.volumen),
  }
}

export async function getOperaciones(limite = 30): Promise<Operacion[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('market_trades')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error || !data) return []
  return (data as any[]).map((t) => ({ ...t, precio: Number(t.precio), coins: Number(t.coins) }))
}

// ------------------------------------------------------------
// Acciones
// ------------------------------------------------------------

export interface Resultado {
  ok: boolean
  error?: string
  coins?: number
  total?: number
  vela?: number
  progreso?: number
  objetivo?: number
  faltan?: number
  item?: string
  restante?: number
  honor?: number
  bonus?: number
  racha?: number
  factor?: number
}

export async function cobrarTarea(taskId: string): Promise<Resultado> {
  const sb = client()
  if (!sb) return { ok: false, error: 'Sin conexión' }
  const { data, error } = await sb.rpc('claim_task', { p_task_id: taskId })
  if (error) return { ok: false, error: error.message }
  return data as Resultado
}

export async function canjear(itemId: string, ffid?: string): Promise<Resultado> {
  const sb = client()
  if (!sb) return { ok: false, error: 'Sin conexión' }
  const { data, error } = await sb.rpc('redeem_item', {
    p_item_id: itemId,
    p_ffid: ffid ?? null,
  })
  if (error) return { ok: false, error: error.message }
  return data as Resultado
}

/**
 * Enseñar u ocultar la cuenta grande en el ranking.
 *
 * Escribe directo a la tabla en vez de pasar por una funcion: la politica
 * "house staff" ya limita el UPDATE a owner y admin, asi que una funcion no
 * añadiria ninguna proteccion, solo una pieza mas que mantener.
 */
export async function verCasaEnTop(visible: boolean): Promise<Resultado> {
  const sb = client()
  if (!sb) return { ok: false, error: 'Sin conexión' }
  const { error } = await sb.from('house_account').update({ visible_top: visible }).eq('id', 1)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** La palanca del owner: mover el mercado a mano. */
export async function operarCasa(lado: 'compra' | 'venta', coins: number): Promise<Resultado> {
  const sb = client()
  if (!sb) return { ok: false, error: 'Sin conexión' }
  const { data, error } = await sb.rpc('house_trade', { p_lado: lado, p_coins: coins })
  if (error) return { ok: false, error: error.message }
  return data as Resultado
}

// ------------------------------------------------------------
// Presentación
// ------------------------------------------------------------

/**
 * Coins con separador de miles: 1200000 → "1.200.000".
 *
 * Se abrevió a "1.2M" en su día por ahorrar ancho, pero un saldo abreviado
 * pierde justo lo que lo hace impresionante. El número entero es el que
 * impone en un ranking, y con `tabular-nums` las columnas siguen cuadrando.
 */
export function coinsCorto(n: number): string {
  // El agrupado se hace a mano, no con toLocaleString.
  //
  // El espanol no separa los numeros de CUATRO cifras: 1500 se escribe asi,
  // sin punto. Es correcto, pero en una lista donde al lado hay "+12.000" y
  // "+50.000" el 1500 parece de otra escala y cuesta compararlos de un
  // vistazo, que es justo para lo que esta la cifra.
  const x = Math.round(n)
  return (x < 0 ? '-' : '') + String(Math.abs(x)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** El precio es minúsculo por diseño: hacen falta muchos decimales. */
export function precioTexto(p: number): string {
  if (!p) return '—'
  return '$' + p.toFixed(p < 0.01 ? 6 : 4)
}

export const COLOR_RAREZA: Record<Rareza, { borde: string; texto: string; fondo: string; etiqueta: string }> = {
  // 'basura' iba en text-white/50 y el premio de entrada -el unico que casi
  // todos pueden pagar- era el que peor se leia de la vitrina.
  basura:     { borde: 'border-white/20',      texto: 'text-white/80',    fondo: 'bg-white/[0.05]',    etiqueta: 'Común' },
  normal:     { borde: 'border-sky-400/30',    texto: 'text-sky-300',     fondo: 'bg-sky-400/[0.06]',  etiqueta: 'Raro' },
  epico:      { borde: 'border-fuchsia-400/35',texto: 'text-fuchsia-300', fondo: 'bg-fuchsia-500/[0.07]', etiqueta: 'Épico' },
  legendario: { borde: 'border-amber-400/45',  texto: 'text-amber-300',   fondo: 'bg-amber-400/[0.08]', etiqueta: 'Legendario' },
}

// ------------------------------------------------------------
// Apuestas PvP
// ------------------------------------------------------------

export interface Duelo {
  id: string
  creador_nombre: string
  rival_nombre: string | null
  monto: number
  estado: 'abierta' | 'jugando' | 'resuelta' | 'cancelada'
  ganador_id: string | null
  creador_id: string
  rival_id: string | null
  created_at: string
  resuelta_en: string | null
}

/**
 * Duelos que están pasando o acaban de pasar.
 *
 * Se leen directamente de `bets` con la clave anónima: la tabla es de lectura
 * pública a propósito. Ver quién se está jugando qué es media gracia del
 * asunto, y lo que empuja a alguien a abrir su primer reto.
 *
 * Nada de esto permite MOVER una apuesta: crear, aceptar y resolver son
 * funciones que solo puede llamar el bot con la clave de servicio.
 */
export async function getDuelos(limite = 8): Promise<Duelo[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('bets')
    .select(
      'id,creador_nombre,rival_nombre,monto,estado,ganador_id,creador_id,rival_id,created_at,resuelta_en'
    )
    // Lo vivo primero y lo recién resuelto después: una apuesta cancelada no
    // le interesa a nadie y solo ocuparía sitio.
    .in('estado', ['abierta', 'jugando', 'resuelta'])
    .order('created_at', { ascending: false })
    .limit(limite)
  if (error || !data) return []
  return (data as any[]).map((d) => ({ ...d, monto: Number(d.monto) }))
}
