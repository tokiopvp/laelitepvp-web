'use client'

import { useEffect, useState } from 'react'
import { Member, Tournament } from './types'
import type { Competidor } from './data'
import {
  getMembers,
  getTournaments,
  getUltimaSync,
  getCompetidores,
  subscribeToTable,
} from './data'

// Realtime es el mecanismo principal; esto es solo un latido de respaldo por si
// la suscripcion se cae sin avisar. Antes eran 20 s, que en un movil de gama
// baja son peticiones y re-renders cada 20 s en cada pagina. El polling corto
// se habia puesto para tapar un realtime que parecia muerto, cuando el problema
// real era que el sync del bot no corria y no habia nada nuevo que emitir.
const LATIDO_MS = 120_000

// Hooks reutilizables: arrancan VACIOS y muestran skeleton hasta la 1ra carga
// real, asi no hay el "flash" de datos demo que luego se reemplazan.
export function useMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const load = () => getMembers().then((m) => {
      if (!active) return
      setMembers(m)
      setLoading(false)
    })
    load()
    const unsub = subscribeToTable('members', load)
    const id = setInterval(load, LATIDO_MS)
    return () => { active = false; clearInterval(id); unsub() }
  }, [])
  return { members, loading }
}

export function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const load = () => getTournaments().then((t) => {
      if (!active) return
      setTournaments(t)
      setLoading(false)
    })
    load()
    const unsub = subscribeToTable('tournaments', load)
    const id = setInterval(load, LATIDO_MS)
    return () => { active = false; clearInterval(id); unsub() }
  }, [])
  return { tournaments, loading }
}

/**
 * Hace cuanto que el dato en pantalla es real.
 *
 * La portada promete "stats actualizadas live desde nuestros bots". Esa frase
 * necesita respaldo visible: si el sync se cae, el visitante tiene que poder
 * verlo. Se refresca cada 30 s en local (sin pedir nada) y relee el
 * `last_sync` cada 2 minutos.
 */
export function useFrescura() {
  const [ultima, setUltima] = useState<Date | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    const load = () => getUltimaSync().then((d) => { if (active) setUltima(d) })
    load()
    const idSync = setInterval(load, LATIDO_MS)
    const idReloj = setInterval(() => setAhora(Date.now()), 30_000)
    return () => { active = false; clearInterval(idSync); clearInterval(idReloj) }
  }, [])

  if (!ultima) return { texto: null, atrasado: false, segundos: null as number | null }

  const segundos = Math.max(0, Math.round((ahora - ultima.getTime()) / 1000))
  const texto =
    segundos < 60 ? `hace ${segundos} s`
    : segundos < 3600 ? `hace ${Math.floor(segundos / 60)} min`
    : segundos < 86400 ? `hace ${Math.floor(segundos / 3600)} h`
    : `hace ${Math.floor(segundos / 86400)} d`

  // El bot sincroniza cada minuto. Pasados 10, algo se rompio: durante 20 horas
  // el sitio mostro datos congelados diciendo LIVE, y nadie pudo notarlo.
  return { texto, atrasado: segundos > 600, segundos }
}

export function useCompetidores() {
  const [competidores, setCompetidores] = useState<Competidor[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const load = () => getCompetidores().then((c) => {
      if (!active) return
      setCompetidores(c)
      setLoading(false)
    })
    load()
    const unsub = subscribeToTable('tournament_participants', load)
    const id = setInterval(load, LATIDO_MS)
    return () => { active = false; clearInterval(id); unsub() }
  }, [])
  return { competidores, loading }
}
