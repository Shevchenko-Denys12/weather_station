/**
 * Shared world-space geometry. 1 unit = 10 mm.
 *
 * Measured from the top-view photo nucleo_f411re.webp (board MB1360C,
 * 3311 × 3978 px): 366.3 px per unit, board centre at photo (1660, 1957).
 * x = (px − 1660) / 366.3, z = (py − 1957) / 366.3. −Z = ST-LINK/USB end.
 *
 * Mounting: the Nucleo (and HW-084) stand on 11.7 mm standoffs, so the
 * breadboard on the table sits below both boards and wires drop down onto it.
 */

export const PITCH = 0.254 // 2.54 mm
export const BOARD_W = 7.0
export const BOARD_L = 8.25
export const BOARD_T = 0.12
export const BOARD_TOP = BOARD_T / 2 // top surface of the PCB (PCB centered at y=0)
export const BOARD_BOTTOM = -BOARD_T / 2
export const GROUND_Y = -1.25 // table surface
export const STANDOFF_H = BOARD_BOTTOM - GROUND_Y // ≈ 11.7 mm brass standoffs under the boards
export const FEMALE_HEADER_H = 0.85
export const STLINK_SPLIT_Z = -1.62 // snap-off slots between ST-LINK and target

/** X of each header's center line. */
export const HEADER_X = {
  CN7: -3.08,
  CN6: -2.47,
  CN8: -2.47,
  CN5: 2.47,
  CN9: 2.47,
  CN10: 3.08,
}

/**
 * Z of morpho row r (1…19, row 1 nearest the USB end). Arduino sockets are
 * aligned to this grid; CN5 sits half a pitch off (the famous 160 mil
 * D7/D8 gap of the Uno layout).
 */
export const rowZ = (r) => 1.38 + (r - 10) * PITCH

/** LQFP64 STM32F411RET6 (U7 on MB1360C) center on the board. */
export const MCU_CENTER = [0.0, 1.61]
export const MCU_BODY = 1.0 // 10 × 10 mm
export const MCU_PITCH = 0.05 // 0.5 mm

/** Ø3.2 mm mounting holes (x, z) — standoffs go here. */
export const NUCLEO_HOLES = [
  [-2.42, -1.32],
  [2.44, -1.23],
  [0.9, 3.89],
]
export const MOUNT_HOLE_R = 0.16
