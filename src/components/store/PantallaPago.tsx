'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, MessageCircle, Clock } from 'lucide-react'
import type { MetodoPago } from '@/lib/data'
import type { Pais } from '@/lib/paises'
import { enlaceWhatsApp } from '@/lib/contacto'

/**
 * Pantalla de PAGO, no de "pedido recibido".
 *
 * Antes el cliente terminaba la compra y leia "te avisamos por Discord": se
 * quedaba con un numero de pedido y sin saber donde pagar, asi que tenia que
 * irse a WhatsApp a preguntar. Cada paso extra ahi es una venta que se cae.
 *
 * Ahora se le entrega lo unico que necesita para pagar YA: los datos de la
 * cuenta, el importe exacto en SU moneda, y el numero de pedido para que lo
 * ponga como referencia.
 */
export default function PantallaPago({
  pedidos, totalUSD, totalLocal, pais, metodos, metodoElegido, whatsapp, onCerrar,
}: {
  pedidos: string[]
  totalUSD: number
  totalLocal: string | null
  pais: Pais
  metodos: MetodoPago[]
  metodoElegido: string
  whatsapp: string | null
  onCerrar: () => void
}) {
  // Solo los metodos que sirven en su pais. Enseñar los demas es ruido que
  // hace dudar justo en el momento de pagar.
  const disponibles = useMemo(
    () => metodos.filter((m) => m.paises.length === 0 || m.paises.includes(pais.code)),
    [metodos, pais.code]
  )

  const [activo, setActivo] = useState(
    () => disponibles.find((m) => m.nombre === metodoElegido)?.id ?? disponibles[0]?.id ?? ''
  )
  useEffect(() => {
    if (!disponibles.some((m) => m.id === activo) && disponibles[0]) {
      setActivo(disponibles[0].id)
    }
  }, [disponibles, activo])

  const metodo = disponibles.find((m) => m.id === activo) ?? null
  // Cada metodo cobra en su moneda: Binance y PayPal en dolares, el resto en
  // la moneda del pais. Cobrar el numero equivocado es peor que no cobrar.
  const importe = metodo?.moneda === 'USD' || !totalLocal
    ? `$${totalUSD.toFixed(2)}`
    : totalLocal

  const [copiado, setCopiado] = useState<string | null>(null)
  const copiar = async (texto: string, marca: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(marca)
      setTimeout(() => setCopiado(null), 1600)
    } catch {
      // Sin permiso de portapapeles no se rompe nada: el dato esta a la vista.
    }
  }

  const referencia = pedidos[0] ?? ''

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(8,8,10,0.9)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 14 }}
        animate={{ scale: 1, y: 0 }}
        className="card w-full max-w-lg my-auto p-6"
      >
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="font-display font-bold text-2xl">Paga tu pedido</h3>
          <span className="font-mono text-[11px] text-white/35">{pais.nombre}</span>
        </div>
        <p className="text-white/55 text-sm mb-5">
          Transfiere el monto exacto y mándanos el comprobante. Entregamos en 5-15 min.
        </p>

        {/* Lo que hay que pagar: el dato mas importante, el mas grande. */}
        <div className="rounded-xl border border-elite-primary/30 bg-elite-primary/[0.07] px-4 py-3 mb-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/45 mb-1">
            Monto a transferir
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono tabular-nums text-3xl font-semibold text-elite-primary">
              {importe}
            </span>
            <button
              onClick={() => copiar(importe.replace(/[^\d.,]/g, ''), 'monto')}
              className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-elite-primary/50 transition-colors inline-flex items-center gap-1.5"
            >
              {copiado === 'monto' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado === 'monto' ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          {metodo?.moneda === 'USD' && totalLocal && (
            <p className="text-[11px] text-white/35 mt-1">
              Este método cobra en dólares. En tu moneda serían {totalLocal}.
            </p>
          )}
        </div>

        {/* Con que pagar */}
        {disponibles.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {disponibles.map((m) => (
              <button
                key={m.id}
                onClick={() => setActivo(m.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activo === m.id
                    ? 'bg-elite-primary text-white'
                    : 'bg-white/[0.05] text-white/55 hover:text-white/85'
                }`}
              >
                {m.nombre}
              </button>
            ))}
          </div>
        )}

        {metodo ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="font-semibold text-sm">{metodo.nombre}</p>
              <button
                onClick={() => copiar(metodo.datos, 'datos')}
                className="shrink-0 text-xs px-2.5 py-1 rounded-lg border border-white/10 hover:border-elite-primary/50 transition-colors inline-flex items-center gap-1.5"
              >
                {copiado === 'datos' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado === 'datos' ? 'Copiado' : 'Copiar datos'}
              </button>
            </div>
            <pre className="font-mono text-[13px] leading-relaxed text-white/80 whitespace-pre-wrap break-words">
              {metodo.datos}
            </pre>
          </div>
        ) : (
          <p className="text-white/45 text-sm mb-4">
            No hay métodos configurados para {pais.nombre}. Escríbenos y lo resolvemos.
          </p>
        )}

        {/* La referencia: sin esto el pago llega sin nombre y hay que rastrearlo. */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 mb-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/45 mb-1">
            Pon esto como referencia
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-sm text-elite-gold break-all">{referencia}</span>
            <button
              onClick={() => copiar(referencia, 'ref')}
              className="shrink-0 text-xs px-2.5 py-1 rounded-lg border border-white/10 hover:border-elite-primary/50 transition-colors inline-flex items-center gap-1.5"
            >
              {copiado === 'ref' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          {pedidos.length > 1 && (
            <p className="text-[11px] text-white/35 mt-1">
              Tu compra generó {pedidos.length} pedidos; con esta referencia los ubicamos todos.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {(
            <a
              href={enlaceWhatsApp(
                `Hola, acabo de pagar el pedido ${referencia} (${importe}). Aquí va mi comprobante:`,
                whatsapp
              )}
              target="_blank"
              rel="noreferrer"
              className="btn-primary w-full justify-center inline-flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Ya pagué · enviar comprobante
            </a>
          )}
          <button onClick={onCerrar} className="btn-secondary w-full justify-center">
            Pagar después
          </button>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/35 mt-4">
          <Clock className="w-3 h-3" />
          Tu pedido queda guardado. Puedes pagar ahora o mandarnos el comprobante luego.
        </p>
      </motion.div>
    </motion.div>
  )
}
