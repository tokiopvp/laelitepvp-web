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
      const { data: sesionGuardada } = await sb!.auth.getSession()
      if (sesionGuardada.session) {
        aplicarSesion(sesionGuardada.session)
      } else if (haySesionGuardada()) {
        const { data: refrescada } = await sb!.auth.refreshSession()
        aplicarSesion(refrescada.session)
      } else {
        aplicarSesion(null)
      }
      setLoading(false)
    }
    restaurar()

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
    }
  }, [])

  const signIn = async () => {
    const sb = supabaseBrowser()
    if (!sb) return
    await sb.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
