/**
 * Full-size solderless breadboard geometry (830 tie points, 165 × 55 mm).
 *
 * Local frame (before rotation), long axis along Z:
 *
 *   rails  a b c d e  ║  f g h i j  rails
 *   − +    ─ row 1 ─  ║  ─ row 1 ─  + −
 *
 * Holes a–e of a row form one net, f–j another; the centre channel separates
 * them. Rails run the full length in groups of five (50 holes per rail).
 *
 * In the scene the board is turned by BB_ROT so rows increase to the right
 * (+X) and it lies in front of the Nucleo: columns f–j and rails R± face the
 * Nucleo (back), a–e and rails L± face the viewer (front).
 * Local origin: centre of the bottom face. 1 unit = 10 mm.
 */
import { GROUND_Y, PITCH } from './layout'

export const BB_POS = [4.0, GROUND_Y, 7.9]
export const BB_ROT = Math.PI / 2
export const BB_ROWS = 63
export const BB_HEIGHT = 0.85
export const BB_TOP = BB_POS[1] + BB_HEIGHT // world y of the top surface
export const BB_W = 21.5 * PITCH
export const BB_L = (BB_ROWS + 2.5) * PITCH

export const COL_X = { a: -5.5, b: -4.5, c: -3.5, d: -2.5, e: -1.5, f: 1.5, g: 2.5, h: 3.5, i: 4.5, j: 5.5 }

/** Power rails: L = side of columns a–e (front), R = side of f–j (back, toward the Nucleo). */
export const RAILS = {
  'L-': { x: -8.5, color: '#2563eb' },
  'L+': { x: -7.5, color: '#dc2626' },
  'R+': { x: 7.5, color: '#dc2626' },
  'R-': { x: 8.5, color: '#2563eb' },
}
export const RAIL_HOLES = 59 // k = 0…58, every 6th (k % 6 === 5) is the gap between groups
const RAIL_OFFSET = (BB_ROWS - (RAIL_HOLES - 1)) / 2 // centres the rails: hole k sits at row k + 2.5

export const rowZ = (row) => (row - (BB_ROWS + 1) / 2) * PITCH
/** Row "number" a rail hole lines up with (half-way between two rows). */
export const railRow = (k) => k + RAIL_OFFSET

/** Local position (top surface) of hole `col` in `row` (1-based; fractional rows allowed for placement). */
export function holeLocal(row, col) {
  if (!(col in COL_X) || row < 1 || row > BB_ROWS) throw new Error(`breadboard: no hole ${col}${row}`)
  return [COL_X[col] * PITCH, BB_HEIGHT, rowZ(row)]
}

/** Local position of rail hole k (0…58) on rail 'L-' | 'L+' | 'R+' | 'R-'. Rail holes sit between rows. */
export function railLocal(rail, k) {
  if (!RAILS[rail] || k < 0 || k >= RAIL_HOLES || k % 6 === 5) throw new Error(`breadboard: no rail hole ${rail}:${k}`)
  return [RAILS[rail].x * PITCH, BB_HEIGHT, rowZ(railRow(k))]
}

const C = Math.cos(BB_ROT)
const S = Math.sin(BB_ROT)
/** Breadboard-local point → world (applies BB_ROT, same convention as Object3D.rotation.y). */
export const bbToWorld = ([x, y, z]) => [BB_POS[0] + x * C + z * S, BB_POS[1] + y, BB_POS[2] - x * S + z * C]

/** World position of hole `col``row`, e.g. hole(22, 'j'). */
export const hole = (row, col) => bbToWorld(holeLocal(row, col))
/** World position of a rail hole, e.g. rail('R+', 4). */
export const rail = (name, k) => bbToWorld(railLocal(name, k))
