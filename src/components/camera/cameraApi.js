import { useBoardStore } from '../../store/useBoardStore'
import { MCU_CENTER } from '../../data/layout'

/**
 * Camera presets and an imperative API for the scene's CameraControls.
 * UI (toolbar, keyboard, double-click) calls these; <CameraRig> registers
 * the controls instance on mount.
 */

const [mx, mz] = MCU_CENTER

/** [camera position, look-at target] in world units (1 = 10 mm). */
export const VIEWS = {
  overview: { label: 'Огляд', key: '1', position: [4.2, 21, 22.5], target: [4.0, 0, 4.4] },
  board: { label: 'Плата', key: '2', position: [0, 11.5, 7.8], target: [0, 0, 0.2] },
  mcu: { label: 'МК', key: '3', position: [mx, 3.4, mz + 2.2], target: [mx, 0.1, mz] },
  stlink: { label: 'ST-LINK', key: '4', position: [0.4, 5.2, 0.6], target: [0.4, 0, -2.75] },
  left: { label: 'CN7 · CN6', key: '5', position: [-6.2, 4.6, 3.6], target: [-2.8, 0.3, 1.5] },
  right: { label: 'CN5 · CN10', key: '6', position: [6.0, 4.6, 3.6], target: [2.7, 0.3, 1.5] },
  breadboard: { label: 'Макетка', key: '7', position: [4.0, 10.5, 16.5], target: [4.0, 0.3, 7.6] },
  top: { label: 'Зверху', key: '8', position: [4.0, 25, 4.6], target: [4.0, 0, 3.4] },
  wiring: { label: 'З’єднання', key: '9', position: [3.6, 15.5, 11.5], target: [3.6, 0, 4.4] },
}

let controls = null
let lastFocus = null // world point of the last clicked part / pin

export function registerControls(c) {
  controls = c
  if (import.meta.env.DEV) window.__cameraControls = c // handy in devtools
}

export function flyTo(view, animate = true) {
  const v = VIEWS[view]
  if (!controls || !v) return
  controls.setLookAt(...v.position, ...v.target, animate)
  useBoardStore.getState().setCameraView(view)
}

/** Center the orbit on a world point and dolly to `distance`. */
export function focusOn(point, distance = 3) {
  if (!controls || !point) return
  lastFocus = point
  controls.moveTo(point[0], point[1], point[2], true)
  controls.dollyTo(distance, true)
  useBoardStore.getState().setCameraView(null)
}

/** Remember what was clicked so "Фокус" / F can fly there later. */
export function rememberFocus(point) {
  lastFocus = point
}

export function focusLast() {
  if (lastFocus) focusOn(lastFocus, 2.5)
}

// small relative moves used by the keyboard
export const nudge = {
  truck: (dx, dz) => {
    controls?.truck(dx, 0, true)
    controls?.forward(dz, true)
  },
  rotate: (azimuth, polar = 0) => controls?.rotate(azimuth, polar, true),
  dolly: (d) => controls?.dolly(d, true),
}
