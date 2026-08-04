// Host colour — auto-assigned, never selectable by players
export const HOST_COLOUR = '#ec5838'

// Player selectable colours (7 options)
export const PLAYER_COLOURS = [
  '#15F4C7', // teal
  '#a855f7', // purple
  '#f472b6', // pink
  '#facc15', // yellow
  '#38bdf8', // blue
  '#a3e635', // lime
  '#ff2d55', // red
]

export function toRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
