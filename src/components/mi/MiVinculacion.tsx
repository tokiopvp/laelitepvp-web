'use client'

/**
 * Las TRES identidades de un jugador, en un solo sitio.
 *
 * Discord es con lo que entra a la web. Free Fire es con lo que juega.
 * WhatsApp es donde vive el clan. Mientras faltaba una de las tres, nada
 * cuadraba: el bot veia subir de rango a un UID y no sabia a quien mencionar
 * en el grupo, y las Elite Coins que se ganan jugando no se podian atar a la
 * persona que las gasta en la tienda.
 *
 * Por eso los dos campos editables van JUNTOS y se guardan de una vez: son la
 * misma decision, no dos formularios.
 *
 * El ID se valida contra el clan REAL. El bot abre el perfil de cada miembro y
 * lee su UID del propio juego, asi que si un ID no esta en esa lista es que no
 * esta en el clan, y decirlo claro ahorra soporte.
 */

import { useState } from 'react'
import { Link2, MessageCircle, Gamepad2, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { guardarVinculacion } from '@/lib/data'
import type { Member, Profile } from '@/lib/types'

const MOTIVOS: Record<string, string> = {
  ffid_no_esta_en_el_clan:
    'Ese ID no aparece en el clan. Revisa el número en tu perfil de Free Fire (arriba a la derecha, junto a "UID").',
  whatsapp_invalido:
    'El número no parece válido. Va con código de país y sin +, espacios ni guiones. Ejemplo Perú: 51987654321',
  whatsapp_en_uso:
    'Ese número ya está vinculado a otra cuenta. Si es tuyo, escríbele a un admin.',
  fallo: 'No se pudo guardar. Inténtalo otra vez en un momento.',
}

interface Props {
  profile: Profile | null
  miembro?: Member | null
  /** Se llama cuando algo cambio, para que la pagina recargue perfil y puntos. */
  onGuardado: () => void | Promise<void>
}

export default function MiVinculacion({ profile, miembro, onGuardado }: Props) {
  const [ffid, setFfid] = useState(profile?.free_fire_id ?? '')
  const [wa, setWa] = useState(profile?.whatsapp ?? '')
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)

  // Solo digitos: es lo que el bot necesita para mencionar a alguien, y evita
  // que la gente pegue "+51 987 654 321" y luego no le llegue la etiqueta.
  const limpiarWa = (v: string) => v.replace(/\D/g, '').slice(0, 15)

  const cambio =
    (ffid.trim() !== (profile?.free_fire_id ?? '')) ||
    (wa !== (profile?.whatsapp ?? ''))

  const guardar = async () => {
    if (!cambio || guardando) return
    setGuardando(true)
    setAviso(null)
    const r = await guardarVinculacion(ffid.trim(), wa)
    if (r.ok) {
      setAviso({
        ok: true,
        texto: r.premiado
          ? '¡Vinculado! Ganaste +20 Elite Coin de bienvenida.'
          : 'Guardado. Tus datos ya están sincronizados con el clan.',
      })
      await onGuardado()
    } else {
      setAviso({ ok: false, texto: MOTIVOS[r.error] ?? MOTIVOS.fallo })
    }
    setGuardando(false)
  }

  const ligado = !!miembro

  return (
    <div className="ff-panel p-6 mb-6">
      <header className="flex items-center justify-between mb-1 pb-3">
        <h2 className="font-display font-bold text-xl flex items-center gap-2 uppercase text-elite-ice">
          <Link2 className="w-5 h-5 text-elite-primary" /> Mi vinculación
        </h2>
        {ligado && (
          <span className="inline-flex items-center gap-1.5 text-xs text-elite-primary">
            <CheckCircle2 className="w-4 h-4" /> {miembro?.nickname}
          </span>
        )}
      </header>

      <p className="text-white/50 text-sm mb-5">
        Tu cuenta de <b className="text-white/80">Discord</b> ya está conectada. Añade tu{' '}
        <b className="text-white/80">ID de Free Fire</b> y tu <b className="text-white/80">WhatsApp</b>{' '}
        para que el bot del clan te reconozca en las tres partes y puedas participar
        en sorteos, retos y competencias.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/45 mb-1.5">
            <Gamepad2 className="w-3.5 h-3.5" /> ID de Free Fire
          </span>
          <input
            className="input ff-cut-sm tabular-nums"
            inputMode="numeric"
            placeholder="Ej. 5345441768"
            value={ffid}
            onChange={(e) => setFfid(e.target.value.replace(/\D/g, '').slice(0, 12))}
          />
          <span className="block text-[11px] text-white/30 mt-1">
            Está en tu perfil del juego, junto a «UID».
          </span>
        </label>

        <label className="block">
          <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/45 mb-1.5">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </span>
          <input
            className="input ff-cut-sm tabular-nums"
            inputMode="numeric"
            placeholder="Ej. 51987654321"
            value={wa}
            onChange={(e) => setWa(limpiarWa(e.target.value))}
          />
          <span className="block text-[11px] text-white/30 mt-1">
            Código de país + número, sin + ni espacios.
          </span>
        </label>
      </div>

      {aviso && (
        <div
          className={`mt-4 flex items-start gap-2 text-sm ${aviso.ok ? 'text-elite-primary' : 'text-elite-danger'}`}
        >
          {aviso.ok ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>{aviso.texto}</span>
        </div>
      )}

      <div className="flex items-center gap-3 mt-5">
        <button
          onClick={guardar}
          disabled={!cambio || guardando}
          className="btn-primary ff-cut-sm justify-center disabled:opacity-40"
        >
          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
        </button>
        {!cambio && !aviso && (
          <span className="text-white/30 text-xs">Sin cambios que guardar.</span>
        )}
      </div>
    </div>
  )
}
