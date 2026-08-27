'use client'

import { AlertTriangle } from 'lucide-react'
import { useFrescura } from '@/lib/hooks'

/**
 * Distintivo de dato en vivo, con respaldo real.
 *
 * Antes era un punto que parpadeaba diciendo LIVE sin consultar nada. El 26 de
 * agosto el sync del bot estuvo caido 20 horas y el sitio siguio diciendo LIVE
 * sobre datos congelados; nadie podia notarlo. Ahora lee el `last_sync` de
 * verdad y, si se atrasa, lo dice.
 */
export default function LiveBadge({ className = '' }: { className?: string }) {
  const { texto, atrasado } = useFrescura()

  // Sin dato todavia: no prometemos nada.
  if (!texto) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-white/40 ${className}`}>
        <span className="h-2 w-2 rounded-full bg-white/25" />
        Conectando…
      </span>
    )
  }

  if (atrasado) {
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${className}`}
        style={{ background: 'rgba(224,166,63,0.12)', color: '#e0a63f' }}
        title="El bot no esta sincronizando. Los datos que ves no son los ultimos."
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        Sin actualizar · {texto}
      </span>
    )
  }

  return (
    <span className={`chip-live ${className}`} title={`Ultima sincronizacion del bot: ${texto}`}>
      <span className="h-2 w-2 rounded-full bg-elite-live animate-pulse" />
      <span>EN VIVO</span>
      <span className="font-mono text-[10px] opacity-70">{texto}</span>
    </span>
  )
}
