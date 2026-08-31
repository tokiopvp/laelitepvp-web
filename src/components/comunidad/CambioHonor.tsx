'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Flame, ArrowRight, Coins, Zap } from 'lucide-react'
import { getHonor, cambiarHonor, coinsCorto, type Honor } from '@/lib/economia'

/**
 * Cambiar honor de clan por Elite Coin.
 *
 * POR QUE ESTA PANTALLA EXISTE
 * ----------------------------
 * Los hitos de estadisticas se cobran UNA vez: el que lleva meses jugando los
 * agota la primera semana y despues no le queda nada que hacer. El honor es lo
 * unico del juego que se renueva solo, cada semana, y que sube exclusivamente
 * jugando. Convertirlo en la fuente principal de coins es lo que hace que
 * seguir jugando siga pagando.
 *
 * LA RACHA, NO EL VOLUMEN
 * -----------------------
 * El bonus se gana por dias seguidos haciendo honor, no por cambiar mucho de
 * golpe. Un bonus por volumen se lo lleva siempre el mismo -el que ya iba
 * ganando- y el resto lo lee como "esto no es para mi". La racha la puede
 * tener cualquiera, y premia justo lo que interesa: que entren todos los dias.
 */
export default function CambioHonor({
  autenticado,
  onCambio,
}: {
  autenticado: boolean
  onCambio: (texto: string, ok: boolean) => void
}) {
  const [h, setH] = useState<Honor | null>(null)
  const [cantidad, setCantidad] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (!autenticado) return
    getHonor().then(setH)
  }, [autenticado])

  const n = useMemo(() => parseInt(cantidad.replace(/\D/g, ''), 10) || 0, [cantidad])
  const rinde = useMemo(
    () => (h ? Math.floor(n * h.tasa_efectiva) : 0),
    [n, h],
  )

  if (!autenticado || !h) return null

  const disponible = h.disponible ?? 0
  const minimo = h.min_canje ?? 50
  const puede = n >= minimo && n <= disponible && !ocupado

  const cambiar = async () => {
    setOcupado(true)
    const r = await cambiarHonor(n)
    setOcupado(false)
    if (!r.ok) return onCambio(r.error || 'No se pudo cambiar.', false)
    setCantidad('')
    setH(await getHonor())
    onCambio(`+${coinsCorto(r.coins ?? 0)} Elite Coin por ${n} de honor`, true)
  }

  // Los pasos se recortan a lo que la persona TIENE. Un boton "50.000" que
  // siempre da error no es un atajo, es una trampa.
  const pasos = [minimo, 500, 2000, 10000].filter((p) => p <= disponible)

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glow p-5 sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Flame className="w-5 h-5 text-elite-danger" />
            Cambia tu honor
          </h2>
          <p className="text-white/40 text-sm mt-0.5">
            El honor que haces en el clan se convierte en Elite Coin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
        {h.es_booster && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-400/30">
            <span className="text-xs font-display font-bold text-fuchsia-200">Booster</span>
            <span className="text-xs font-mono text-elite-success">
              +{Math.round((h.bonus_booster ?? 0) * 100)}%
            </span>
          </div>
        )}
        {h.racha > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-elite-gold/10 border border-elite-gold/30">
            <Zap className="w-3.5 h-3.5 text-elite-gold" />
            <span className="text-xs font-display font-bold text-elite-gold">
              {h.racha} {h.racha === 1 ? 'día' : 'días'} seguidos
            </span>
            {h.bonus > 0 && (
              <span className="text-xs font-mono text-elite-success">
                +{Math.round(h.bonus * 100)}%
              </span>
            )}
          </div>
        )}
        </div>
      </header>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <Dato etiqueta="Honor disponible" valor={disponible.toLocaleString('es')} destacado />
        <Dato
          etiqueta="Cambio actual"
          valor={`1 → ${h.tasa_efectiva} coins`}
          nota={
            [
              `base ${h.tasa}`,
              h.bonus > 0 ? `racha +${Math.round(h.bonus * 100)}%` : null,
              h.bonus_booster ? `boost +${Math.round(h.bonus_booster * 100)}%` : null,
            ]
              .filter(Boolean)
              .join(' · ')
          }
        />
        <Dato etiqueta="Ya cambiado" valor={(h.canjeado_total ?? 0).toLocaleString('es')} />
      </div>

      {disponible < minimo ? (
        <p className="text-sm text-white/50 bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          Necesitas al menos <b className="text-white/80">{minimo}</b> de honor para cambiar.
          El honor sube jugando partidas de clan en Free Fire, y el bot lo lee solo.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-3">
            {pasos.map((p) => (
              <button
                key={p}
                onClick={() => setCantidad(String(p))}
                className="px-3 py-1.5 rounded-lg text-xs font-mono bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 transition-colors"
              >
                {p.toLocaleString('es')}
              </button>
            ))}
            <button
              onClick={() => setCantidad(String(disponible))}
              className="px-3 py-1.5 rounded-lg text-xs font-display font-bold bg-elite-gold/10 hover:bg-elite-gold/20 border border-elite-gold/30 text-elite-gold transition-colors"
            >
              TODO
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              inputMode="numeric"
              className="input w-36 font-mono"
              placeholder={String(minimo)}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
            <ArrowRight className="w-4 h-4 text-white/30 shrink-0" />
            <span className="inline-flex items-center gap-2 font-mono font-bold text-elite-gold tabular-nums">
              <Coins className="w-4 h-4" />
              {coinsCorto(rinde)}
            </span>
            <button
              onClick={cambiar}
              disabled={!puede}
              className="btn-primary px-5 py-2.5 text-sm disabled:opacity-35 disabled:cursor-not-allowed ml-auto"
            >
              {ocupado ? 'Cambiando…' : 'Cambiar'}
            </button>
          </div>

          {n > disponible && (
            <p className="text-xs text-elite-danger mt-2">
              Solo tienes {disponible.toLocaleString('es')} de honor.
            </p>
          )}

          {h.racha < 10 && (
            <p className="text-xs text-white/35 mt-3">
              Haz honor {10 - h.racha} {10 - h.racha === 1 ? 'día' : 'días'} más seguidos
              y sumas <b className="text-elite-gold">+50%</b> al cambio.
              {!h.es_booster && ' Con boost del servidor, otro +50%.'}
            </p>
          )}
        </>
      )}
    </motion.section>
  )
}

function Dato({
  etiqueta,
  valor,
  nota,
  destacado,
}: {
  etiqueta: string
  valor: string
  nota?: string
  destacado?: boolean
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
      <p className="text-[11px] uppercase tracking-wider text-white/35">{etiqueta}</p>
      <p
        className={`font-display font-bold tabular-nums mt-0.5 ${
          destacado ? 'text-elite-danger text-xl' : 'text-white/90'
        }`}
      >
        {valor}
      </p>
      {nota && <p className="text-[11px] text-white/30 mt-0.5">{nota}</p>}
    </div>
  )
}
