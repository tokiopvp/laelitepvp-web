/**
 * Color de cada rango de Free Fire.
 *
 * Vivia suelto dentro de la pagina de torneos, asi que el panel del jugador se
 * quedo sin el y la pagina entera dejo de compilar. Un dato que usan dos
 * pantallas no puede ser privado de una.
 *
 * OJO: esto es el color del NOMBRE del rango, no el emblema. El emblema real
 * recortado del perfil (`emblema_br_url`) manda siempre que exista: el juego
 * dice "EMBLEMA HEROICO" para media lista y ese texto no distingue a nadie.
 */
export const RANK_COLORS: Record<string, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Platinum: '#e5e4e2',
  Diamond: '#b9f2ff',
  Master: '#ff6b6b',
  Grandmaster: '#ff2d6f',
}

/** El color de un rango, con un gris de reserva para los que no tienen. */
export function colorRango(rango?: string | null): string {
  return (rango ? RANK_COLORS[rango] : null) || '#6b6156'
}
