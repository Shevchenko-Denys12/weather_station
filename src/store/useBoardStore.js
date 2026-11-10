import { create } from 'zustand'
import { ENV_DEFAULTS } from '../simulator/environment'

const SERIAL_LIMIT = 300
const INITIAL_GPIO = { PA5: 0, PA8: 0, PC13: 1 }

/**
 * Global state shared by the 3D scene and the UI overlay.
 *
 * - interaction: what the user hovers / selected on the board
 * - gpio:        logical pin levels driven by the simulator (HAL)
 * - simulation:  run status, currently executing source line
 * - serial:      lines printed through USART2 (ST-LINK virtual COM port)
 * - env:         ambient conditions the simulated sensors measure (Environment panel)
 * - oled:        pixel frame shown on the SSD1306 (null = display off / not initialised)
 */
export const useBoardStore = create((set, get) => ({
  // ── interaction ─────────────────────────────────────────────
  // parts (MCU, buttons, LEDs…) and individual pins are selected
  // exclusively: picking one clears the other.
  hoveredId: null,
  selectedId: null,
  setHovered: (id) => set({ hoveredId: id }),
  select: (id) => set({ selectedId: id, selectedPin: null }),

  hoveredPin: null, // pin id, e.g. 'CN10-23' or 'U7-41'
  selectedPin: null,
  setHoveredPin: (id) => set({ hoveredPin: id }),
  selectPin: (id) => set({ selectedPin: id, selectedId: null }),

  clearSelection: () => set({ selectedId: null, selectedPin: null }),

  // camera preset currently shown (null after manual navigation)
  cameraView: 'overview',
  setCameraView: (cameraView) => set({ cameraView }),

  // which pin label layers are drawn on the board
  labels: { arduino: true, morpho: true, mcu: true },
  toggleLabels: (layer) => set((s) => ({ labels: { ...s.labels, [layer]: !s.labels[layer] } })),

  // ── GPIO ────────────────────────────────────────────────────
  // NUCLEO-F411RE: LD2 → PA5 (D13), B1 → PC13 (active low, pulled up),
  // external LED1 on the breadboard → PA8 (D7)
  gpio: { ...INITIAL_GPIO },
  writePin: (pin, value) =>
    set((s) => ({ gpio: { ...s.gpio, [pin]: value ? 1 : 0 } })),
  readPin: (pin) => get().gpio[pin] ?? 0,

  // ── simulation ──────────────────────────────────────────────
  status: 'idle', // 'idle' | 'running'
  activeLine: null,
  setStatus: (status) => set({ status }),
  setActiveLine: (activeLine) => set({ activeLine }),

  // ── serial monitor ──────────────────────────────────────────
  serial: [],
  serialPrint: (text) =>
    set((s) => {
      const line = { t: performance.now(), text: text.replace(/\r?\n$/, '') }
      const next = [...s.serial, line]
      return { serial: next.length > SERIAL_LIMIT ? next.slice(-SERIAL_LIMIT) : next }
    }),
  clearSerial: () => set({ serial: [] }),

  // ── ambient environment (kept across Stop / Reset: it is the user's input, not MCU state) ──
  env: { ...ENV_DEFAULTS },
  setEnv: (patch) => set((s) => ({ env: { ...s.env, ...patch } })),
  resetEnv: () => set({ env: { ...ENV_DEFAULTS } }),

  // DS3231 speed relative to real time (so the 15-minute logging interval can be watched); see devices.js
  rtcSpeed: 60,
  setRtcSpeed: (rtcSpeed) => set({ rtcSpeed }),

  // ── OLED (SSD1306 128×64) ───────────────────────────────────
  oled: null, // Uint8Array(128 * 64) of 0 / 1 while the display is on
  setOled: (oled) => set({ oled }),

  // full reset (Reset button B2 / Stop)
  resetBoard: () => set({ gpio: { ...INITIAL_GPIO }, activeLine: null, oled: null }),
}))
