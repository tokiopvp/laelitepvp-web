/**
 * Base de conocimiento de Free Fire.
 *
 * Esto NO es un modelo de lenguaje: es una base de respuestas con recuperacion
 * por relevancia. La decision es deliberada y tiene una razon tecnica: la web
 * es un export estatico, sin servidor. Un modelo necesitaria una maquina
 * encendida, VRAM y latencia de red; esta base viaja con la pagina, responde
 * en microsegundos y funciona aunque el PC de casa este apagado.
 *
 * Para que no se note plantilla, cada entrada trae VARIAS redacciones y se
 * elige una al azar, y la recuperacion pondera sinonimos y errores de escritura
 * comunes en vez de exigir la palabra exacta.
 */

export interface Entrada {
  id: string
  /** Palabras que disparan la entrada. Se comparan normalizadas. */
  claves: string[]
  /** Palabras que suman relevancia pero no bastan solas. */
  apoyo?: string[]
  /** Redacciones alternativas: se elige una, para no repetir siempre igual. */
  respuestas: string[]
  /** Sugerencias que se ofrecen despues de responder. */
  seguir?: string[]
  categoria: 'armas' | 'personajes' | 'mascotas' | 'rango' | 'mapa' | 'tactica' | 'ajustes' | 'tienda' | 'clan' | 'general'
}

export const BASE: Entrada[] = [
  // ─────────────────────────────── ARMAS
  {
    id: 'mp40',
    categoria: 'armas',
    claves: ['mp40', 'mp 40'],
    apoyo: ['cerca', 'cerrada', 'rush', 'subfusil'],
    respuestas: [
      'La MP40 es la reina del combate pegado. Su cadencia es la más alta del juego, así que a menos de 10 metros gana casi cualquier duelo. El precio es el retroceso: a media distancia se te va sola. Llévala con un cargador extendido y no intentes pelear lejos con ella.',
      'MP40: cadencia brutal, alcance corto. Es la que quieres cuando entras a una casa. Si el enemigo está a más de 15 metros, cambia — a esa distancia te la gana casi cualquier fusil.',
    ],
    seguir: ['¿Con qué la combino?', 'Sensi para rushear'],
  },
  {
    id: 'ak47',
    categoria: 'armas',
    claves: ['ak47', 'ak 47', 'ak-47'],
    apoyo: ['fusil', 'dano', 'daño'],
    respuestas: [
      'La AK47 pega más fuerte por bala que cualquier otro fusil, pero el primer disparo salta y el retroceso sube en vertical. Dispara en ráfagas de 4 o 5 balas en vez de mantener apretado y arrastra hacia abajo mientras disparas.',
      'AK47: máximo daño por bala del apartado de fusiles. A cambio, el retroceso castiga. Ráfagas cortas y arrastre hacia abajo; si mantienes apretado, las últimas balas se van al cielo.',
    ],
    seguir: ['¿AK47 o M4A1?', 'Cómo controlar el retroceso'],
  },
  {
    id: 'm1887',
    categoria: 'armas',
    claves: ['m1887', 'm 1887', 'escopeta'],
    apoyo: ['shotgun', 'cerca'],
    respuestas: [
      'La M1887 mata de uno o dos tiros a quemarropa, pero solo tiene dos cartuchos y la recarga es lenta. Es un arma de emboscada: aparece, dispara los dos, y cambia de arma en vez de recargar en medio del duelo.',
      'M1887: dos tiros, y si aciertas ambos casi nadie sobrevive. El error clásico es quedarse recargando delante del enemigo — cambia de arma, es más rápido.',
    ],
    seguir: ['¿M1887 o MP40?', 'Trucos de combate cerrado'],
  },
  {
    id: 'awm',
    categoria: 'armas',
    claves: ['awm'],
    apoyo: ['sniper', 'francotirador', 'largo', 'distancia'],
    respuestas: [
      'La AWM solo sale de las cajas aéreas y es la única que mata de un headshot aunque el enemigo lleve casco nivel 3. Apunta un poco por encima si está lejos: la bala cae. Y no la uses en corta, el zoom te ciega.',
      'AWM: la más letal a distancia y la única que atraviesa casco nivel 3 de un tiro a la cabeza. Solo aparece en cajas aéreas. Compénsale la caída de bala apuntando algo más arriba cuando el blanco está lejos.',
    ],
    seguir: ['Sensi para sniper', 'Cómo mejorar mi puntería'],
  },
  {
    id: 'comparar_ak_m4',
    categoria: 'armas',
    claves: ['ak o m4', 'm4 o ak', 'ak47 o m4a1', 'm4a1 o ak47', 'mejor fusil'],
    respuestas: [
      'Depende de tu pulso. La AK47 pega más por bala pero castiga el error; la M4A1 hace menos daño y es mucho más fácil de controlar, así que aciertas más balas. Si te tiembla el arrastre, la M4A1 te da más kills reales aunque el papel diga otra cosa.',
      'AK47 para quien controla el retroceso: menos balas para matar. M4A1 para quien prefiere estabilidad: menos daño por bala pero acierta más. En la práctica gana la que te deje acertar.',
    ],
  },
  {
    id: 'mejor_arma_cerca',
    categoria: 'armas',
    claves: ['mejor arma cerca', 'arma para rushear', 'combate cerrado', 'pelea cerrada', 'corta distancia'],
    respuestas: [
      'Para pegado: MP40 si quieres cadencia constante, M1887 si buscas matar de un golpe. La MP40 perdona más porque si fallas sigues disparando; con la escopeta, fallar los dos tiros te deja vendido.',
      'Corta distancia: MP40 o M1887. La MP40 es más segura, la escopeta más explosiva. Muchos llevan las dos: escopeta para entrar, MP40 para rematar.',
    ],
    seguir: ['Sensi para rushear', 'Trucos de gloo wall'],
  },

  // ─────────────────────────────── PERSONAJES
  {
    id: 'alok',
    categoria: 'personajes',
    claves: ['alok', 'dj alok'],
    respuestas: [
      'Alok crea un área que cura poco a poco y da velocidad de movimiento a ti y a tu escuadra. Es el más versátil del juego: sirve para entrar, para aguantar y para rotar. Si solo vas a tener uno, que sea este.',
      'DJ Alok: cura en área + velocidad para todo el equipo. Su fuerza es que sirve en cualquier situación, no que sea el mejor en una. Por eso es el estándar en escuadra.',
    ],
    seguir: ['¿Qué combinación de habilidades uso?', 'Mejor personaje para escuadra'],
  },
  {
    id: 'combo_personajes',
    categoria: 'personajes',
    claves: ['combinacion', 'combo', 'que personajes uso', 'mejor combinacion'],
    apoyo: ['habilidades', 'pasivas', 'activa'],
    respuestas: [
      'La regla es una activa y tres pasivas que la acompañen. Si tu activa es de curación, mete pasivas de movimiento; si es de movimiento, mete pasivas de aguante. Meter cuatro habilidades buenas que no se hablan entre sí es el error más común.',
      'Una activa que defina tu estilo y tres pasivas que la refuercen. Lo importante no es que cada habilidad sea buena por separado, sino que empujen en la misma dirección.',
    ],
  },
  {
    id: 'personaje_escuadra',
    categoria: 'personajes',
    claves: ['personaje para escuadra', 'mejor personaje escuadra', 'personaje squad'],
    respuestas: [
      'En escuadra manda lo que ayuda a los cuatro, no lo que te ayuda a ti. Un personaje de curación o velocidad en área vale más que uno de daño personal, porque una escuadra que aguanta gana más partidas que una que pega fuerte.',
    ],
  },

  // ─────────────────────────────── MASCOTAS
  {
    id: 'mascotas',
    categoria: 'mascotas',
    claves: ['mascota', 'mascotas', 'pet'],
    respuestas: [
      'La mascota aporta una pasiva que se suma a tu personaje. Las de recuperación de EP y las que dan información del enemigo son las más rentables en rankeada; las de daño casi nunca compensan. Elige según lo que te falte, no según cuál se ve mejor.',
      'Las mascotas dan una pasiva extra. En rankeada valen más las de sostener la pelea (EP) o las que te dan información que las vistosas. Piensa qué te falta y cubre ese hueco.',
    ],
  },

  // ─────────────────────────────── RANGO
  {
    id: 'subir_rango',
    categoria: 'rango',
    claves: ['subir rango', 'subir de rango', 'rankear', 'subir corona', 'como subo'],
    apoyo: ['heroico', 'maestro', 'diamante'],
    respuestas: [
      'Los puntos vienen más de sobrevivir que de matar. Un top 3 sin kills suma más que un cuarto puesto con cinco. Cae en zonas tranquilas, rota temprano hacia el centro de la zona y pelea solo cuando tienes ventaja de posición.',
      'Para subir: prioriza colocación sobre kills. Aterriza lejos de las zonas calientes, rota antes de que se cierre el círculo y elige tus peleas. Las kills llegan solas cuando llegas vivo al final.',
    ],
    seguir: ['Estrategia de rotación', 'Cómo elegir dónde caer'],
  },
  {
    id: 'heroico',
    categoria: 'rango',
    claves: ['heroico', 'llegar a heroico'],
    respuestas: [
      'Heroico se llega siendo constante, no jugando espectacular. Los que llegan no son los que más matan: son los que casi nunca mueren pronto. Juega en escuadra fija si puedes, y evita las horas de madrugada donde te tocan rivales muy por encima.',
    ],
  },

  // ─────────────────────────────── MAPA Y ROTACIÓN
  {
    id: 'rotacion',
    categoria: 'tactica',
    claves: ['rotacion', 'rotar', 'como rotar', 'moverme en el mapa'],
    apoyo: ['zona', 'circulo'],
    respuestas: [
      'Rota temprano y por el borde de la zona, no por el centro. Quien llega primero elige la cobertura; quien llega tarde entra peleando contra gente ya colocada. La regla simple: si ves la zona y estás fuera, muévete ya.',
      'Muévete antes de que te obligue la zona. Ir por los bordes y llegar pronto te da la posición; correr en el último momento te deja en campo abierto con todos mirando.',
    ],
    seguir: ['Dónde caer', 'Cómo usar la gloo wall'],
  },
  {
    id: 'donde_caer',
    categoria: 'tactica',
    claves: ['donde caer', 'donde aterrizar', 'zona de caida', 'donde tirarme'],
    respuestas: [
      'Si quieres subir rango, cae donde no cae nadie: bordes del mapa, casas sueltas, zonas sin nombre. Consigues equipo tranquilo y llegas al medio juego completo. Las zonas calientes son para practicar puntería, no para rankear.',
      'Depende de tu objetivo. Para rankear, sitios tranquilos del borde y rotar pronto. Para mejorar puntería, cae en lo más caliente y acepta morir mucho al principio.',
    ],
  },
  {
    id: 'gloo',
    categoria: 'tactica',
    claves: ['gloo', 'gloo wall', 'pared', 'muro'],
    respuestas: [
      'La gloo wall no es solo para taparte: úsala para cortar la línea de tiro y moverte. Ponla en diagonal y avanza por el lado que el enemigo no ve. Ponerla justo delante y quedarte quieto solo te convierte en un blanco que sabe dónde está.',
      'Truco: colócala en ángulo, no de frente. De frente te protege pero te encierra; en diagonal te tapa y te deja avanzar. Y llévate al menos dos, siempre.',
    ],
  },
  {
    id: 'granada_humo',
    categoria: 'tactica',
    claves: ['humo', 'granada de humo', 'smoke'],
    respuestas: [
      'El humo sirve para dos cosas: revivir a un compañero caído y cruzar campo abierto. Tíralo entre tú y el enemigo, no encima de ti. Y recuerda que quien ya te vio puede seguir disparando a donde estabas: muévete dentro del humo, no te quedes.',
    ],
  },

  // ─────────────────────────────── AJUSTES
  {
    id: 'punteria',
    categoria: 'ajustes',
    claves: ['punteria', 'apuntar', 'mejorar punteria', 'headshot', 'tiro a la cabeza'],
    respuestas: [
      'La puntería es mantener la mira a la altura de la cabeza ANTES de ver al enemigo, no corregir después. Practica caminar por el mapa con la mira siempre a esa altura. Eso da más headshots que cualquier sensibilidad.',
      'Tres cosas, por orden de importancia: mira siempre a altura de cabeza mientras te mueves, ráfagas cortas en vez de mantener apretado, y una sensibilidad que no tengas que corregir. La sensi es la última, no la primera.',
    ],
    seguir: ['Dame mi sensibilidad', 'Cómo controlar el retroceso'],
  },
  {
    id: 'retroceso',
    categoria: 'ajustes',
    claves: ['retroceso', 'recoil', 'controlar el arma', 'se me sube'],
    respuestas: [
      'El retroceso se controla con el dedo, no con los ajustes: arrastra hacia abajo mientras disparas, con la misma fuerza con la que sube el arma. Practica en la sala de entrenamiento disparando a una pared y mirando el patrón que dejan las balas.',
    ],
  },
  {
    id: 'lag',
    categoria: 'ajustes',
    claves: ['lag', 'laguea', 'va lento', 'trabado', 'fps'],
    respuestas: [
      'Primero baja gráficos a Suave y desactiva sombras: es lo que más FPS devuelve. Luego cierra apps en segundo plano y juega con el móvil desenchufado del cargador (se calienta menos y no baja el rendimiento). Si sigue, el problema suele ser la conexión, no el teléfono.',
    ],
    seguir: ['Ajustes recomendados', 'Dame mi sensibilidad'],
  },

  // ─────────────────────────────── TIENDA Y CLAN
  {
    id: 'diamantes',
    categoria: 'tienda',
    claves: ['diamantes', 'recarga', 'comprar diamantes', 'precio', 'cuanto cuesta'],
    respuestas: [
      'Vendemos recargas con entrega en 5-15 minutos y precio en tu moneda. Entra a PagoStore, elige el paquete, y ahí mismo te salen los datos para pagar.',
    ],
    seguir: ['Ir a PagoStore'],
  },
  {
    id: 'entrar_clan',
    categoria: 'clan',
    claves: ['entrar al clan', 'unirme', 'como entro', 'quiero entrar'],
    respuestas: [
      'La Elite PvP acepta gente que juegue en serio y sepa perder. Entra a la sección Unirse, deja tu ID y te contactamos. Se pide llevar el tag PVP en el nombre.',
    ],
    seguir: ['Ver miembros', 'Ver tops del clan'],
  },

  // ─────────────────────────────── OPTIMIZACIÓN DEL TELÉFONO
  {
    id: 'boton_disparo',
    categoria: 'ajustes',
    claves: ['boton de disparo', 'tamaño del boton', 'boton mas grande', 'boton mas pequeño'],
    apoyo: ['hud', 'disparo', 'porcentaje'],
    respuestas: [
      'El botón viene al 50-60% para todos, y ahí está el fallo: ese porcentaje se aplica sobre TU pantalla, pero el dedo mide lo mismo en un móvil de 6.1" que en uno de 6.8". Dime tu modelo y te calculo el porcentaje que deja el botón del tamaño físico correcto.',
    ],
    seguir: ['Redmi Note 12', 'iPhone 13', 'Samsung A54'],
  },
  {
    id: 'graficos',
    categoria: 'ajustes',
    claves: ['graficos', 'calidad grafica', 'ajustes graficos', 'que graficos pongo'],
    respuestas: [
      'Para jugar bien: gráficos en Suave y sombras desactivadas. Suena a bajar calidad, pero lo que ganas son fotogramas estables, y unos FPS constantes te dan más kills que unas texturas bonitas. Si tu móvil aguanta 90 o 120 Hz, actívalo: eso sí se nota.',
      'Suave + sombras apagadas. Las sombras son lo que más cuesta y lo que menos aporta. Si tienes panel de alta tasa de refresco, actívalo: importa más que cualquier otro ajuste gráfico.',
    ],
    seguir: ['Se me traba el juego', 'Dame mi sensibilidad'],
  },
  {
    id: 'calentamiento',
    categoria: 'ajustes',
    claves: ['se calienta', 'calienta mucho', 'temperatura', 'recalienta'],
    apoyo: ['baja fps', 'se pone lento'],
    respuestas: [
      'Cuando el móvil se calienta baja su propio rendimiento para protegerse, y ahí es cuando empieza a ir a tirones. Tres cosas: juega desenchufado (cargar calienta el doble), quítale la funda en partidas largas, y no lo dejes al sol ni sobre la cama, que tapa la disipación.',
      'El calor te baja los FPS aunque el móvil sea bueno. Desenchúfalo mientras juegas, quítale la funda y déjalo sobre una superficie dura. Si notas que a los 15 minutos empeora, es esto.',
    ],
    seguir: ['Se me traba el juego', '¿Qué gráficos pongo?'],
  },
  {
    id: 'ping',
    categoria: 'ajustes',
    claves: ['ping', 'conexion', 'internet', 'me saca del juego', 'desconecta'],
    respuestas: [
      'El ping alto no se arregla con ajustes del juego. Ponte cerca del router o usa datos si tu wifi está saturado, cierra descargas en segundo plano y evita que otros vean vídeo mientras juegas. Si el ping salta solo a ratos, casi siempre es alguien más en tu red.',
    ],
  },
  {
    id: 'protector',
    categoria: 'ajustes',
    claves: ['mica', 'protector', 'vidrio templado', 'no responde el tactil'],
    respuestas: [
      'Un protector grueso o mal pegado te mete retardo en el toque y a veces se come arrastres. Si notas que el dedo va y la mira no, prueba a jugar sin él un rato: si mejora, ya sabes. Y limpia la pantalla, que la grasa hace que el dedo se enganche en vez de deslizar.',
    ],
  },
  {
    id: 'dedos',
    categoria: 'ajustes',
    claves: ['cuantos dedos', 'garra', 'claw', '4 dedos', 'tres dedos'],
    respuestas: [
      'Con dos dedos no puedes moverte, apuntar y disparar a la vez: siempre sacrificas uno. Con tres ya disparas mientras te mueves. Con cuatro además saltas y te agachas sin soltar la mira. Sube de uno en uno y dedica una semana a cada paso, o solo conseguirás jugar peor que antes.',
      'Tres dedos es el salto que más cambia: uno mueve, otro apunta, otro dispara. Cuatro es para quien ya domina tres. No intentes pasar de dos a cuatro de golpe.',
    ],
    seguir: ['¿Cómo mejoro mi puntería?', 'Dame mi sensibilidad'],
  },
  {
    id: 'entrenar',
    categoria: 'tactica',
    claves: ['practicar', 'entrenar', 'sala de entrenamiento', 'como practico', 'rutina'],
    respuestas: [
      'Quince minutos antes de jugar, y siempre lo mismo: cinco de arrastre en pared para ver tu patrón de retroceso, cinco de cambiar de blanco moviendo la mira a altura de cabeza, y cinco con el arma que peor se te da. Jugar mil partidas sin esto solo repite tus errores.',
      'Rutina corta y fija: pared para ver el retroceso, blancos moviéndote con la mira a altura de cabeza, y práctica del arma que peor llevas. Quince minutos diarios rinden más que tres horas de partidas.',
    ],
    seguir: ['¿Cómo controlo el retroceso?', '¿Cómo mejoro mi puntería?'],
  },
  {
    id: 'apps_fondo',
    categoria: 'ajustes',
    claves: ['apps en segundo plano', 'cerrar apps', 'liberar memoria', 'ram'],
    respuestas: [
      'Cierra de verdad lo que tengas abierto antes de entrar, sobre todo redes sociales y navegador. Y desactiva las notificaciones mientras juegas: cada aviso roba un instante de rendimiento y encima te tapa media pantalla justo cuando estás peleando.',
    ],
  },
]

/** Sugerencias de arranque cuando el chat está vacío. */
export const SUGERENCIAS = [
  '¿Qué tamaño de botón de disparo me conviene?',
  'Dame la sensibilidad para mi celular',
  '¿MP40 o M1887 para pelear de cerca?',
  '¿Cómo subo a Heroico?',
  'Se me traba el juego, ¿qué hago?',
  '¿Cuántos dedos debo usar?',
  '¿Qué gráficos pongo?',
  '¿Cómo mejoro mi puntería?',
]
