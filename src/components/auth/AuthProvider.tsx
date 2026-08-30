'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabaseBrowser } from '@/lib/supabase/client'

export type Role = 'owner' | 'admin' | 'moderator' | 'editor' | 'member'

interface AuthContextValue {
  user: User | null
  role: Role | null
  loading: boolean
  isAuthed: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  loading: true,
  isAuthed: false,
  signIn: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = supabaseBrowser()
    if (!sb) {
      setLoading(false)
      return
    }

    const fetchRole = async (uid: string) => {
      const { data } = await sb!.from('profiles').select('role').eq('id', uid).maybeSingle()
      setRole((data?.role as Role) ?? null)
    }

    const aplicarSesion = (session: { user: User } | null) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchRole(session.user.id)
      else setRole(null)
    }

    /** Si el navegador guarda algo de Supabase, o sea, si alguien inicio sesion aqui alguna vez. */
    const haySesionGuardada = () => {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith('sb-') && k.includes('-auth-token')) return true
        }
      } catch {
        // Modo privado o almacenamiento bloqueado: se asume que no hay nada.
      }
      return false
    }

    // Restauracion robusta: si hay sesion guardada la usamos; si no, se intenta
    // refrescar el token SOLO cuando queda rastro de una sesion previa.
    //
    // Antes se refrescaba siempre. Para un visitante que nunca ha entrado, eso
    // es una peticion que tarda ~0,6 s y SIEMPRE devuelve 400: bloqueaba la
    // pantalla por un token que no existe. Y es redundante, porque `getSession`
    // ya refresca solo cuando el token guardado esta caducado; si devuelve
    // null, no hay nada que refrescar.
    const restaurar = async () => {
      // `finally` NO es opcional aqui.
      //
      // Media web espera a que `loading` pase a false: si algo de aqui dentro
      // LANZA -y `getSession` lanza cuando iOS bloquea el almacenamiento, y
      // `refreshSession` cuando la red se corta- la promesa queda rechazada sin
      // que nadie la recoja, `setLoading(false)` no llega nunca y la pagina se
      // queda con la rueda girando PARA SIEMPRE. Es justo lo que estaban viendo
      // algunos miembros al entrar a su cuenta.
      //
      // Ante un fallo se da la sesion por cerrada: enseñar la pantalla de
      // iniciar sesion es recuperable -se vuelve a pulsar el boton-; una rueda
      // eterna no lo es.
      try {
        const { data: sesionGuardada } = await sb!.auth.getSession()
        if (sesionGuardada.session) {
          aplicarSesion(sesionGuardada.session)
        } else if (haySesionGuardada()) {
          const { data: refrescada } = await sb!.auth.refreshSession()
          aplicarSesion(refrescada.session)
        } else {
          aplicarSesion(null)
        }
      } catch {
        aplicarSesion(null)
      } finally {
        setLoading(false)
      }
    }
    restaurar()

    // Cinturon: pase lo que pase, a los ocho segundos se deja de esperar.
    // Cubre incluso el caso de que una promesa no resuelva NI rechace, que es
    // lo que ocurre cuando el navegador congela una peticion en segundo plano.
    const corteCarga = setTimeout(() => setLoading(false), 8000)

    const { data: sub } = sb.auth.onAuthStateChange((_event: string, session: Session | null) => {
      aplicarSesion(session)
    })

    // Keep-alive: refresca el token periodicamente para que la sesion
    // nunca expire por inactividad (persistente para todos).
    const keepAlive = setInterval(() => {
      sb!.auth.refreshSession()
    }, 25 * 60 * 1000)

    return () => {
      sub.subscription.unsubscribe()
      clearInterval(keepAlive)
      clearTimeout(corteCarga)
    }
  }, [])

  const signIn = async () => {
    const sb = supabaseBrowser()
    if (!sb) return
    await sb.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        // Solo 'identify': devuelve el ID y nombre de usuario de Discord.
        // Sin 'email' no se exige correo verificado para entrar.
        scopes: 'identify',
        // Siempre al dominio con www, nunca a `location.origin`.
        //
        // El sitio responde tambien en laelitepvp.com sin www, y son origenes
        // distintos para el navegador. Si el login empezaba en uno y Discord
        // devolvia al otro, el verificador PKCE quedaba guardado en el origen
        // equivocado: el canje fallaba y la pantalla se colgaba en
        // "Autenticando con Discord".
        redirectTo: 'https://www.laelitepvp.com/auth/callback',
      },
    })
  }

  const signOut = async () => {
    const sb = supabaseBrowser()
    if (!sb) return
    await sb.auth.signOut()
    setUser(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider
      value={{ user, role, loading, isAuthed: !!user, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
