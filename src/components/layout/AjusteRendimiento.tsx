'use client'

import { useEffect } from 'react'
import { useGama } from '@/components/layout/Resplandor'

/**
 * Marca la gama del equipo en el <html> para que la hoja de estilos decida.
 *
 * POR QUE ASI Y NO TOCANDO CADA COMPONENTE
 * ----------------------------------------
 * El efecto mas caro de la web es `backdrop-filter: blur(18px)` en la clase
 * `.card`, y esa clase se usa en 51 sitios. En la pagina de miembros eso son
 * cuarenta tarjetas obligando al navegador a: renderizar lo que hay detras de
 * cada una, desenfocarlo, y componerlo. Cada fotograma. Al desplazarse, todo
 * eso se rehace porque el fondo de detras cambia.
 *
 * En una grafica dedicada ni se nota. En una integrada es lo que convierte el
 * scroll en una sucesion de tirones, y es la diferencia entre "en mi PC vuela"
 * y "en la de mi amigo va lagueada".
 *
 * Con un atributo en el <html> se apaga de golpe en todas partes, sin tocar los
 * 51 sitios y sin riesgo de dejarse uno. La tarjeta ya tiene su propio
 * degradado de fondo, asi que al quitar el desenfoque solo hace falta subirle
 * un poco la opacidad para que siga tapando igual: sobre un fondo oscuro la
 * diferencia no se ve.
 */
export default function AjusteRendimiento() {
  const { gama, quieto } = useGama()

  useEffect(() => {
    const raiz = document.documentElement
    raiz.dataset.gama = gama
    if (quieto) raiz.dataset.quieto = 'si'
    else delete raiz.dataset.quieto
  }, [gama, quieto])

  return null
}
