import { supabaseBrowser } from './supabase/client'
import {
  demoMembers,
  demoTournaments,
  demoProducts,
  demoNews,
} from './demo-data'
import type { Member, Tournament, Product, News, PaymentMethod, Setting, Profile, PointEvent } from './types'
import { consultar, marcarConexion } from './conexion'
import { conMedia, conMediaLista } from './media'

function client() {
  try {
    return supabaseBrowser()
  } catch {
    return null
  }
}

export async function getMembers(): Promise<Member[]> {
  const sb = client()
  if (!sb) return demoMembers
  const bruto = await consultar<Member[]>(
    sb.from('members').select('*').eq('is_active', true),
  )
  if (bruto === null) return []
  if (bruto.length === 0) return []
  const data = conMediaLista(bruto as unknown as Record<string, unknown>[]) as unknown as Member[]

  // Fetch Elite Coins from profiles (points column)
  const { data: profiles } = await sb
    .from('profiles')
    .select('member_id, points')
    .not('member_id', 'is', null)

  const coinsByMember = new Map<string, number>()
  if (profiles) {
    for (const p of profiles) {
      if (p.member_id && p.points != null) {
        coinsByMember.set(p.member_id, p.points)
      }
    }
  }

  // Merge coins into members
  const withCoins = (data as Member[]).map((m) => ({
    ...m,
    coins: coinsByMember.get(m.id) ?? m.coins ?? null,
  }))

  return conMediaLista(withCoins as unknown as Record<string, unknown>[]) as unknown as Member[]
}

export async function getTournaments(): Promise<Tournament[]> {
  const sb = client()
  if (!sb) return demoTournaments
  const { data, error } = await sb
    .from('tournaments')
    .select('*')
    .order('date_played', { ascending: false })
  if (error) return []
  if (!data || data.length === 0) return []
  return data as Tournament[]
}

export async function getProducts(): Promise<Product[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('category')
  // Ante un fallo se devuelve vacio y la tienda dice "no disponible". Caer a
  // datos de demostracion mostraba PRECIOS FALSOS como si fueran reales, que
  // es peor que no mostrar nada: el cliente escribe por WhatsApp con una cifra
  // que no existe.
  if (error || !data) return []
  return data as Product[]
}

/**
 * Los packs de Elite Coin a la venta, ordenados de menor a mayor precio.
 *
 * Son productos normales de la tienda que se distinguen por `coins_entrega`:
 * el panel los edita igual que un pack de diamantes, sin tocar codigo.
 */
export async function getPacksCoins(): Promise<Product[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('is_active', true)
    .gt('coins_entrega', 0)
    .order('price_usd')
  if (error || !data) return []
  return data as Product[]
}

/**
 * Momento de la ultima sincronizacion del bot, para poder decir en pantalla
 * hace cuanto que el dato es real en vez de un puntito que dice LIVE sin
 * consultar nada.
 */
export async function getUltimaSync(): Promise<Date | null> {
  const sb = client()
  if (!sb) return null
  const { data, error } = await sb
    .from('members')
    .select('last_sync')
    .order('last_sync', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data?.last_sync) return null
  return new Date(data.last_sync as string)
}

/**
 * Tasas USDT -> moneda local, puestas por el sync del bot.
 *
 * NO se piden a Binance desde el navegador ni desde una Cloudflare Function:
 * Binance bloquea las IPs del borde y devolvia vacio para las seis monedas.
 * La maquina que corre el bot si las alcanza, asi que las deja aqui cada
 * minuto y la tienda las lee de la base como cualquier otro dato.
 */
export async function getRates(): Promise<Record<string, number>> {
  const sb = client()
  if (!sb) return {}
  const { data, error } = await sb
    .from('settings')
    .select('value')
    .eq('key', 'rates_json')
    .maybeSingle()
  if (error || !data?.value) return {}
  try {
    return JSON.parse(data.value as string) as Record<string, number>
  } catch {
    return {}
  }
}

export async function getNews(): Promise<News[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('news')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
  if (error || !data) return []
  return data as News[]
}

export async function getNewsBySlug(slug: string): Promise<News | null> {
  const sb = client()
  if (!sb) return demoNews.find((n) => n.slug === slug) ?? null
  const { data, error } = await sb
    .from('news')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error || !data) return demoNews.find((n) => n.slug === slug) ?? null
  return data as News
}

export function subscribeToTable(table: string, onChange: () => void): () => void {
  const sb = client()
  if (!sb) return () => {}
  const channel = sb
    .channel(`${table}-changes`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange())
    .subscribe()
  return () => {
    sb.removeChannel(channel)
  }
}

// ---- Store: crear pedido y registrar actividad (usa anon key + policies) ----
export interface NewOrder {
  order_number: string
  customer_name: string
  free_fire_id?: string | null
  customer_discord?: string | null
  customer_email?: string | null
  product_id?: string | null
  quantity?: number
  total_usd: number
  status?: string
  payment_method?: string | null
  notes?: string | null
  /**
   * Cuenta del comprador logueado. Solo las compras de Elite Coins la llevan:
   * sin ella no habria donde acreditar. Los diamantes no la necesitan: se
   * entregan por el ID de Free Fire.
   */
  created_by?: string | null
}

export async function createOrder(order: NewOrder): Promise<{ error: string | null }> {
  const sb = client()
  if (!sb) return { error: 'Sin conexión a la base de datos' }
  const { error } = await sb.from('orders').insert({
    ...order,
    status: order.status ?? 'pending',
    quantity: order.quantity ?? 1,
  })
  return { error: error?.message ?? null }
}

/**
 * Estado actual de unos pedidos, por su numero de referencia.
 *
 * Lo usa la tienda para que el cliente que vuelve vea en que va su compra sin
 * escribirle a nadie. Se consulta por referencia y no por cliente porque la
 * tienda no exige cuenta: el numero de pedido es lo unico que identifica una
 * compra, y solo lo tiene quien la hizo.
 */
export async function getEstadoPedidos(
  referencias: string[]
): Promise<Record<string, string>> {
  const sb = client()
  if (!sb || referencias.length === 0) return {}
  const { data, error } = await sb
    .from('orders')
    .select('order_number,status')
    .in('order_number', referencias.slice(0, 50))
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const r of data as { order_number: string; status: string }[]) {
    out[r.order_number] = r.status
  }
  return out
}

export async function logActivity(
  action: string,
  meta?: Record<string, unknown>
): Promise<void> {
  const sb = client()
  if (!sb) return
  try {
    await sb.from('activity_logs').insert({
      action,
      entity_type: 'store',
      metadata: meta ?? {},
    })
  } catch {
    // Silencioso: si no hay politica aun, no debe romper la UI
  }
}

export async function getActivityLogs(limit = 50): Promise<any[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data
}

/**
 * Avisa de una venta o actividad.
 *
 * La funcion `/api/notify` reparte a Discord y a Telegram desde el servidor:
 * el webhook y el token del bot nunca llegan al navegador, porque cualquiera
 * con ellos puede publicar en tus canales.
 *
 * Es deliberadamente silenciosa. Si el aviso falla, la compra YA esta guardada
 * en la base de datos; hacer estallar la interfaz por una notificacion le diria
 * al cliente que su pedido no entro cuando si entro.
 */
export async function notificar(payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    // silencioso
  }
}

/** Nombre anterior, cuando el unico destino era Discord. */
export const notifyDiscord = notificar

// ---- Metodos de pago (administrables) ----
export async function getPaymentMethods(country?: string): Promise<PaymentMethod[]> {
  const sb = client()
  if (!sb) return []
  let q = sb.from('payment_methods').select('*').eq('enabled', true).order('position')
  if (country) q = q.or(`country.eq.ALL,country.eq.${country}`)
  const { data, error } = await q
  if (error || !data) return []
  return data as PaymentMethod[]
}

export async function getAllPaymentMethods(): Promise<PaymentMethod[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb.from('payment_methods').select('*').order('position')
  if (error || !data) return []
  return data as PaymentMethod[]
}

export async function createPaymentMethod(input: Partial<PaymentMethod>): Promise<{ error: string | null }> {
  const sb = client()
  if (!sb) return { error: 'Sin conexión' }
  const { error } = await sb.from('payment_methods').insert(input)
  return { error: error?.message ?? null }
}

export async function updatePaymentMethod(id: string, input: Partial<PaymentMethod>): Promise<{ error: string | null }> {
  const sb = client()
  if (!sb) return { error: 'Sin conexión' }
  const { error } = await sb.from('payment_methods').update(input).eq('id', id)
  return { error: error?.message ?? null }
}

export async function deletePaymentMethod(id: string): Promise<{ error: string | null }> {
  const sb = client()
  if (!sb) return { error: 'Sin conexión' }
  const { error } = await sb.from('payment_methods').delete().eq('id', id)
  return { error: error?.message ?? null }
}

// ---- Ajustes generales (WhatsApp, etc.) ----
export async function getSetting(key: string): Promise<string | null> {
  const sb = client()
  if (!sb) return null
  const { data, error } = await sb.from('settings').select('value').eq('key', key).maybeSingle()
  if (error || !data) return null
  return data.value as string | null
}

export async function setSetting(key: string, value: string): Promise<{ error: string | null }> {
  const sb = client()
  if (!sb) return { error: 'Sin conexión' }
  const { error } = await sb.from('settings').upsert({ key, value, updated_at: new Date().toISOString() })
  return { error: error?.message ?? null }
}

// ---- Perfil de miembro + puntos virtuales (Elite Coin) ----
/**
 * El id del usuario que tiene la sesion abierta.
 *
 * POR QUE NO SE USA `auth.getUser()`
 * ----------------------------------
 * `getUser()` va A LA RED a validar el token contra Supabase. Si esa peticion
 * falla -movil con mala cobertura, token que justo toca refrescar, un 500
 * pasajero- devuelve `user: null`, y las funciones que dependian de el
 * retornaban `null` EN SILENCIO.
 *
 * El problema es que `AuthProvider` decide `isAuthed` con `getSession()`, que
 * es LOCAL. Asi que la pagina creia que habias entrado -y pintaba tu panel-
 * mientras los datos venian vacios: "Bienvenido," sin nombre, "Jugador" y 0
 * Elite Coin. Eso es justo lo que veian algunos miembros, incluidos los que ya
 * habian entrado otras veces. Y por "Acceso Staff" si funcionaba porque el
 * area de admin se apoya en la sesion local, no en estas consultas.
 *
 * Ahora se pregunta primero a la sesion guardada (sin red, la misma fuente que
 * usa el proveedor) y solo se cae a `getUser()` si no hubiera ninguna. Con eso
 * las dos partes de la web responden siempre lo mismo.
 */
async function uidActual(sb: NonNullable<ReturnType<typeof client>>): Promise<string | null> {
  try {
    const { data: s } = await sb.auth.getSession()
    if (s.session?.user?.id) return s.session.user.id
  } catch {
    /* almacenamiento bloqueado (iOS en privado): se prueba por red */
  }
  try {
    const { data: u } = await sb.auth.getUser()
    return u.user?.id ?? null
  } catch {
    return null
  }
}

export async function getMyProfile(): Promise<Profile | null> {
  const sb = client()
  if (!sb) return null
  const uid = await uidActual(sb)
  if (!uid) return null
  try {
    const { data, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle()
    if (error && !error.code) marcarConexion(false)
    else marcarConexion(true)
    if (error || !data) return null
    return conMedia(data as Record<string, unknown>) as unknown as Profile
  } catch {
    marcarConexion(false)
    return null
  }
}

// Otorga puntos de check-in (10/dia) via RPC seguro. Devuelve saldo nuevo o null.
export async function dailyCheckin(): Promise<number | null> {
  const sb = client()
  if (!sb) return null
  const uid = await uidActual(sb)
  if (!uid) return null
  const { data, error } = await sb.rpc('award_points', { p_profile_id: uid, p_type: 'checkin' })
  if (error) return null
  return data as number
}

/**
 * Guarda de una vez el ID de Free Fire y el WhatsApp del jugador.
 *
 * Es lo que ata las TRES identidades: Discord (con el que inicia sesion),
 * Free Fire (con el que juega) y WhatsApp (con el que el bot lo etiqueta en el
 * grupo). Mientras faltaba una, el bot no podia relacionar "el que subio de
 * rango" con "a quien menciono", y las Elite Coins no se podian trazar.
 *
 * Devuelve un motivo concreto cuando falla, para poder decirle a la persona
 * QUE esta mal en vez de un "no se pudo guardar".
 */
export type ResultadoVinculacion =
  | { ok: true; premiado: boolean; nickname: string | null }
  | { ok: false; error: 'ffid_no_esta_en_el_clan' | 'whatsapp_invalido' | 'whatsapp_en_uso' | 'fallo' }

export async function guardarVinculacion(
  ffid: string,
  whatsapp: string,
): Promise<ResultadoVinculacion> {
  const sb = client()
  if (!sb) return { ok: false, error: 'fallo' }
  const { data, error } = await sb.rpc('guardar_vinculacion', {
    p_ffid: ffid || null,
    p_whatsapp: whatsapp || null,
  })
  if (error || !data) return { ok: false, error: 'fallo' }
  const r = data as any
  return r.ok
    ? { ok: true, premiado: !!r.premiado, nickname: r.nickname ?? null }
    : { ok: false, error: r.error ?? 'fallo' }
}

// Vincula la cuenta a un miembro del clan por Free Fire ID (RPC seguro).
export async function linkMember(ffid: string): Promise<boolean> {
  const sb = client()
  if (!sb) return false
  const { data, error } = await sb.rpc('link_member', { p_ffid: ffid })
  if (error) return false
  return !!data
}

export async function getPointEvents(): Promise<PointEvent[]> {
  const sb = client()
  if (!sb) return []
  const uid = await uidActual(sb)
  if (!uid) return []
  const { data, error } = await sb
    .from('point_events')
    .select('*')
    .eq('profile_id', uid)
    .order('created_at', { ascending: false })
    // La pagina muestra un historial corto. Sin tope, quien lleve meses
    // jugando se descarga cientos de filas para leer las ultimas diez.
    .limit(50)
  if (error || !data) return []
  return data as PointEvent[]
}

export async function getLeaderboard(limit = 50): Promise<Profile[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('profiles')
    .select('id, display_name, points, member_id, avatar_url')
    .order('points', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data as Profile[]
}

// ---- Retos / Objetivos (Fase 2) ----
export interface Challenge {
  id: string
  title: string
  description: string | null
  metric: string
  target: number
  points: number
  active: boolean
  created_at: string
}

export async function getChallenges(): Promise<Challenge[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('challenges')
    .select('*')
    .eq('active', true)
    .order('points', { ascending: false })
  if (error || !data) return []
  return data as Challenge[]
}

// Evalua los retos del usuario contra sus stats y otorga puntos por los nuevos cumplidos.
export async function checkChallenges(): Promise<number | null> {
  const sb = client()
  if (!sb) return null
  const uid = await uidActual(sb)
  if (!uid) return null
  const { data, error } = await sb.rpc('check_challenges', { p_profile_id: uid })
  if (error) return null
  return data as number
}

export async function getMyChallengeCompletions(): Promise<Set<string>> {
  const sb = client()
  const set = new Set<string>()
  if (!sb) return set
  const uid = await uidActual(sb)
  if (!uid) return set
  const { data, error } = await sb
    .from('challenge_completions')
    .select('challenge_id')
    .eq('profile_id', uid)
  if (error || !data) return set
  data.forEach((r: { challenge_id: string }) => set.add(r.challenge_id))
  return set
}

// ---- Competencia en vivo (participantes y su avance) ----
export interface Competidor {
  member_id: string
  nickname: string
  avance: number
  rank: string | null
  avatar_url: string | null
}

/**
 * Los que ESTAN compitiendo y cuanto llevan sumado, no el clan entero.
 *
 * `tournament_participants.kills` guarda el AVANCE desde que abrio la
 * competencia (actual - base), que lo calcula el sync del bot. La pagina
 * mostraba los 49 miembros del clan, que no es lo que pasa en la carrera.
 */
export async function getCompetidores(): Promise<Competidor[]> {
  const sb = client()
  if (!sb) return []
  // El torneo mas reciente es la competencia viva.
  const { data: torneo } = await sb
    .from('tournaments')
    .select('id')
    .order('date_played', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!torneo?.id) return []

  const { data, error } = await sb
    .from('tournament_participants')
    .select('member_id, kills, members(nickname, rank, avatar_url)')
    .eq('tournament_id', torneo.id)
    .order('kills', { ascending: false })
  if (error || !data) return []

  return (data as any[])
    .filter((r) => r.members)
    .map((r) => ({
      member_id: r.member_id,
      nickname: r.members.nickname,
      avance: r.kills ?? 0,
      rank: r.members.rank ?? null,
      avatar_url: r.members.avatar_url ?? null,
    }))
}

// ---- Metodos de pago CON sus datos (cuenta, cedula, telefono) ----
export interface MetodoPago {
  id: string
  nombre: string
  datos: string
  moneda: string
  paises: string[]
}

/**
 * Los datos con los que el cliente paga, publicados por el sync desde la
 * configuracion del bot de ventas.
 *
 * La tabla `payment_methods` solo tenia nombre y emoji, asi que la tienda
 * podia registrar el pedido pero no decir DONDE pagar: el cliente terminaba
 * y se iba a WhatsApp a preguntar. Esto es lo que cierra la venta.
 */
export async function getMetodosPago(): Promise<MetodoPago[]> {
  const sb = client()
  if (!sb) return []
  const { data, error } = await sb
    .from('settings')
    .select('value')
    .eq('key', 'pagos_json')
    .maybeSingle()
  if (error || !data?.value) return []
  try {
    return JSON.parse(data.value as string) as MetodoPago[]
  } catch {
    return []
  }
}

// ---- Filtraciones de Free Fire (las recolecta el bot de ventas) ----
export interface Leak {
  titulo: string
  resumen: string
  fuente: string
  fecha: string
  ts: number
  link: string
  imagen: string | null
}

/**
 * Lo que se viene en Free Fire, segun seis fuentes que el bot vigila.
 *
 * Es un AGREGADOR: se muestra el titular, un adelanto corto y de donde salio,
 * y el clic va siempre al medio que lo publico. Ni se copia el articulo ni se
 * esconde la fuente; el valor esta en juntarlo y traducirlo, no en quedarselo.
 */
export async function getLeaks(): Promise<{ items: Leak[]; actualizado: number }> {
  const sb = client()
  if (!sb) return { items: [], actualizado: 0 }
  const { data, error } = await sb
    .from('settings')
    .select('value')
    .eq('key', 'leaks_json')
    .maybeSingle()
  if (error || !data?.value) return { items: [], actualizado: 0 }
  try {
    const j = JSON.parse(data.value as string)
    return { items: (j.items ?? []) as Leak[], actualizado: j.actualizado ?? 0 }
  } catch {
    return { items: [], actualizado: 0 }
  }
}

/**
 * UN miembro por su id, sin el bulto.
 *
 * POR QUE EXISTE
 * --------------
 * `/mi` necesita los datos de UNA persona -la que tiene vinculada- y los
 * conseguia descargando `getMembers()`: los 36 miembros con `select('*')`, que
 * son **230 KB** porque arrastra `stats_json` y las treinta columnas de
 * telemetria. Luego hacia `members.find(...)` y tiraba el resto. En un movil
 * con datos eso son varios segundos de rueda girando antes de ver nada.
 *
 * Esta version pide una fila y solo las columnas que la pagina pinta: unos
 * **3 KB**. Se excluye `stats_json` a proposito; es el grueso del peso y no se
 * muestra en ningun sitio.
 */
const CAMPOS_PERFIL_MIEMBRO =
  'id,nickname,free_fire_id,role_in_clan,rank,level,avatar_url,outfit_image_url,' +
  'kd_ratio,headshots,wins,booyahs,kills,winrate,kpp,partidas,dano_partida,' +
  'headshot_tasa,top10_tasa,max_kills,revividas,last_sync'

export async function getMember(id: string): Promise<Member | null> {
  const sb = client()
  if (!sb || !id) return null
  const { data, error } = await sb
    .from('members')
    .select(CAMPOS_PERFIL_MIEMBRO)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as Member
}

/**
 * Los miembros SIN la telemetria pesada.
 *
 * `getMembers()` trae `select('*')`, y eso incluye `stats_json`: 230 KB para
 * treinta y seis personas. Las paginas que solo pintan nick, foto y cuatro
 * cifras -la portada, por ejemplo- no necesitan nada de eso, y en la PORTADA
 * es donde mas duele: es lo primero que carga alguien que llega por primera
 * vez, muchas veces con datos moviles.
 *
 * Los tops de armas SI leen `stats_json`; esas pantallas siguen usando
 * `getMembers()`.
 */
export async function getMembersLigero(): Promise<Member[]> {
  const sb = client()
  if (!sb) return demoMembers
  const bruto = await consultar<Member[]>(
    sb
      .from('members')
      .select(CAMPOS_PERFIL_MIEMBRO + ',is_active,joined_at,role_in_clan')
      .eq('is_active', true) as never,
  )
  if (!bruto) return []
  const data = conMediaLista(bruto as unknown as Record<string, unknown>[]) as unknown as Member[]
  const ROLE_ORDER: Record<string, number> = { leader: 0, interim_leader: 1, elder: 2, member: 3 }
  const sorted = [...(data as unknown as Member[])].sort((a, b) => {
    const ra = ROLE_ORDER[a.role_in_clan || 'member'] ?? 3
    const rb = ROLE_ORDER[b.role_in_clan || 'member'] ?? 3
    if (ra !== rb) return ra - rb
    return (b.kills ?? 0) - (a.kills ?? 0)
  })
  // Las fotos, por el mismo camino que los datos.
  return conMediaLista(sorted as unknown as Record<string, unknown>[]) as unknown as Member[]
}
