'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle2, X, MessageCircle, Copy, Check } from 'lucide-react'
import { getEstadoPedidos } from '@/lib/data'
import { enlaceWhatsApp } from '@/lib/contacto'
import {
  leerPendientes, olvidarPendiente, guardarEstados, type PedidoPendiente,
} from '@/lib/carrito'

/**
 * "Tienes una compra a medias."
 *
 * Es lo primero que ve quien vuelve a la tienda con un pedido sin cerrar. Antes
 * no existia: el cliente pagaba por su app de banco, volvia, y la tienda le
 * mostraba el catalogo como si no hubiera pasado nada. Su numero de referencia
 * habia quedado en una pantalla cerrada, asi que no podia mandar el comprobante
 * ni preguntar por su pedido sin dar explicaciones desde cero.
 *
 * El estado se relee de la base en cada visita, no se cree lo guardado: un
 * pedido ya entregado deja de aparecer solo.
 */
const ETIQUETA: Record<string, { texto: string; clase: string }> = {
  pending: { texto: 'Esperando tu pago', clase: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
  paid: { texto: 'Pago recibido · preparando', clase: 'text-elite-primary border-elite-primary/30 bg-elite-primary/10' },
  processing: { texto: 'Enviando tus diamantes', clase: 'text-elite-secondary border-elite-secondary/30 bg-elite-secondary/10' },
  delivered: { texto: 'Entregado', clase: 'text-elite-gold border-elite-gold/30 bg-elite-gold/10' },
  cancelled: { texto: 'Cancelado', clase: 'text-red-400 border-red-400/30 bg-red-400/10' },
}

function haceCuanto(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

export default function PedidosPendientes({ whatsapp }: { whatsapp: string | null }) {
  const [items, setItems] = useState<PedidoPendiente[]>([])
  const [copiada, setCopiada] = useState<string | null>(null)

  useEffect(() => {
    const guardados = leerPendientes()
    if (guardados.length === 0) return
    setItems(guardados)

    // La base manda. Si ya se entrego, se deja de molestar al cliente.
    getEstadoPedidos(guardados.map((p) => p.referencia)).then((estados) => {
      if (Object.keys(estados).length === 0) return
      guardarEstados(estados)
      for (const [ref, est] of Object.entries(estados)) {
        if (est === 'delivered' || est === 'cancelled') olvidarPendiente(ref)
      }
      setItems(leerPendientes().map((p) => ({ ...p, estado: estados[p.referencia] ?? p.estado })))
    })
  }, [])

  const descartar = (ref: string) => {
    olvidarPendiente(ref)
    setItems((prev) => prev.filter((p) => p.referencia !== ref))
  }

  const copiar = async (ref: string) => {
    try {
      await navigator.clipboard.writeText(ref)
      setCopiada(ref)
      setTimeout(() => setCopiada(null), 1800)
    } catch {
      // Sin permiso de portapapeles la referencia sigue visible para copiarla
      // a mano; no hace falta avisar de nada.
    }
  }

  if (items.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
      aria-label="Tus pedidos en curso"
    >
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-5 h-5 text-elite-gold" />
        <h2 className="font-display font-bold text-xl">
          {items.length === 1 ? 'Tienes una compra en curso' : `Tienes ${items.length} compras en curso`}
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <AnimatePresence initial={false}>
          {items.map((p) => {
            const et = ETIQUETA[p.estado ?? 'pending'] ?? ETIQUETA.pending
            const pagado = p.estado === 'paid' || p.estado === 'processing'
            return (
              <motion.div
                key={p.referencia}
                layout
                exit={{ opacity: 0, scale: 0.96 }}
                className="card p-4 relative"
              >
                <button
                  onClick={() => descartar(p.referencia)}
                  aria-label="Quitar de la lista"
                  className="absolute top-3 right-3 text-white/25 hover:text-white/70 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border ${et.clase}`}>
                  {pagado ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {et.texto}
                </span>

                <p className="font-display font-semibold mt-2 leading-snug pr-6">{p.detalle}</p>
                <p className="text-white/45 text-sm">
                  {p.totalLocal ?? `$${p.totalUSD.toFixed(2)}`} · {p.metodo} · {haceCuanto(p.creado)}
                </p>

                <button
                  onClick={() => copiar(p.referencia)}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-elite-primary transition-colors font-mono"
                  title="Copiar referencia"
                >
                  {copiada === p.referencia ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {p.referencia}
                </button>

                {/* El paso que cierra la venta: mandar el comprobante sin tener
                    que explicar quien eres ni que compraste. */}
                <a
                  href={enlaceWhatsApp(
                    pagado
                      ? `Hola, consulto por mi pedido ${p.referencia} (${p.detalle}).`
                      : `Hola, ya pagué el pedido ${p.referencia} (${p.detalle}, ${p.totalLocal ?? '$' + p.totalUSD.toFixed(2)}). Aquí va mi comprobante:`,
                    whatsapp
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary w-full justify-center inline-flex items-center gap-2 mt-3 text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  {pagado ? 'Consultar por mi pedido' : 'Ya pagué · enviar comprobante'}
                </a>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
