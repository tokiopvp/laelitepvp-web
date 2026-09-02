'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { alCambiarConexion, sinConexion } from '@/lib/conexion'

/**
 * Barra que aparece cuando el navegador no llega a la base de datos.
 *
 * POR QUE ES IMPORTANTE
 * ---------------------
 * Sin esto, un jugador cuya red no resuelve el dominio de Supabase ve la web
 * entera cargada y aparentemente rota: "0 MIEMBROS OFICIALES", cero tareas, el
 * mercado sin abrir, su saldo en cero. Da igual cuántas veces recargue, porque
 * el problema no está en la web.
 *
 * Con dos jugadores pasó exactamente eso el mismo día, y desde fuera parecía
 * que se habían borrado los datos del clan.
 *
 * DICE QUE HACER, NO SOLO QUE PASA
 * --------------------------------
 * "Error de conexión" no ayuda a nadie. Los dos casos reales se arreglaban
 * cambiando el DNS del teléfono, así que eso es lo que pone. Un aviso que no
 * lleva a una acción es un aviso que se ignora.
 */
export default function AvisoSinConexion() {
  const [caido, setCaido] = useState(false)

  useEffect(() => {
    setCaido(sinConexion())
    return alCambiarConexion(setCaido)
  }, [])

  if (!caido) return null

  return (
    <div
      role="alert"
      className="fixed bottom-0 inset-x-0 z-[60] bg-elite-danger/95 backdrop-blur px-4 py-3 shadow-lg shadow-black/50"
    >
      <div className="max-w-3xl mx-auto flex items-start gap-3">
        <WifiOff className="w-5 h-5 shrink-0 mt-0.5 text-white" />
        <div className="text-white text-sm leading-snug">
          <b className="font-display">No consigo conectar con el servidor.</b> Lo que ves está
          vacío por eso, no porque falten tus datos: siguen ahí.
          <span className="block text-white/80 text-xs mt-1">
            Suele ser el DNS del móvil. Prueba con datos en vez de wifi, o entra en Ajustes →
            Conexiones → <b>DNS privado</b> y ponlo en <b>Desactivado</b>.
          </span>
        </div>
      </div>
    </div>
  )
}
