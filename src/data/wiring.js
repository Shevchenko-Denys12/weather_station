/**
 * Every wire of the weather station, as data (C/README.md, "Таблиця з'єднань").
 *
 * Layout rules (row map in data/modules.js), modelled on a classic Fritzing
 * layout: modules side by side, one shared I²C bus, short straight runs:
 *  - all wiring lives in the back half of the breadboard (columns g–j) and on
 *    the back rails R+ (+3V3) / R− (GND), i.e. on the Nucleo side;
 *  - every module takes power from the rail right behind it with a short
 *    "staple" from column j, never from the far side;
 *  - I²C bus = the BMP280's own SDA / SCL rows (42 / 43). D14 / D15 land there,
 *    HW-084 drops SCL / SDA straight into rows 49 / 50, flat lanes link those
 *    rows to the bus, and the OLED chains onto rows 49 / 50 with two more lanes.
 *    Lanes run along the rows in columns g / h / i, so they never cross a wire;
 *  - Nucleo wires all go right and fan out without crossing: the socket further
 *    back lands further right (D2 → 28, D4 → 33, D6 → 34, GND → rail 38.5,
 *    D14 → 42, D15 → 43); staples next to their landing points lean away from them;
 *  - HW-084 wires drop straight down (J1 is lined up with rows 48–52).
 *
 * Endpoints are world points: Nucleo sockets (socketPos), breadboard holes
 * (hole / rail) or the end of a female Dupont housing on HW-084 J1.
 * `fromDir` gives the direction the wire leaves an endpoint (default: up),
 * `via` adds waypoints, `lift` sets the arc height above the higher end.
 */
import { hole, rail } from './breadboard'
import { MODULES, dirToWorld, toWorld } from './modules'
import { socketPos } from './pinout'

export const WIRE_COLORS = {
  '+3V3': '#dc2626', // red
  GND: '#1f2937', // black
  PB8: '#facc15', // SCL, yellow
  PB9: '#16a34a', // SDA, green
  PB5: '#9333ea', // SQW, purple
  PB10: '#2563eb', // DHT11 OUT, blue
  PA10: '#e5e7eb', // SW1, white
}

const NET_LABEL = {
  '+3V3': '+3V3',
  GND: 'GND',
  PB8: 'SCL · PB8',
  PB9: 'SDA · PB9',
  PB5: 'SQW · PB5',
  PB10: 'DHT11 OUT · PB10',
  PA10: 'SW1 · PA10',
}

// HW-084 J1: wire leaves the far end of the Dupont housing, pointing away from the board
const HW = MODULES.HW084
const j1Pin = (name) => HW.pins.find((p) => p.header === 'J1' && p.name === name)
const hwJ1 = (name) => toWorld('HW084', [HW.j1.housing[1], HW.j1.pinY, j1Pin(name).at[2]])
const HW_DIR = dirToWorld('HW084', [-1, 0, 0])

const STAPLE = 0.32 // low, flat jumpers from column j onto the rail right behind
const LANE_H = 0.22 // flat lanes along the rows sit this high above the breadboard

/** Flat jumper along the rows: straight up, level run, straight down (like a cut-to-length wire kit). */
const lane = (from, to, h = LANE_H) => {
  const s = Math.sign(to[0] - from[0]) * 0.12
  return { via: [[from[0] + s, from[1] + h, from[2]], [to[0] - s, to[1] + h, to[2]]] }
}

const W = (id, net, from, to, fromLabel, toLabel, extra = {}) => ({
  id,
  net,
  from,
  to,
  fromLabel,
  toLabel,
  color: WIRE_COLORS[net],
  netLabel: NET_LABEL[net],
  ...extra,
})

export const WIRES = [
  // ── Nucleo → breadboard: all to the right, fanning out without crossings ──
  W('n-3v3', '+3V3', socketPos('3V3', 'CN6'), rail('R+', 6), 'CN6-4 · 3V3', 'задня шина +3V3', { lift: 0.75 }),
  W('n-d2', 'PA10', socketPos('D2', 'CN9'), hole(28, 'j'), 'CN9-3 · D2 · PA10', 'SW1 виводи 1–2 (ряд 28)', { lift: 0.45 }),
  W('n-d4', 'PB5', socketPos('D4', 'CN9'), hole(33, 'j'), 'CN9-5 · D4 · PB5', 'ряд 33 (SQW)', { lift: 0.5 }),
  W('n-d6', 'PB10', socketPos('D6', 'CN9'), hole(34, 'j'), 'CN9-7 · D6 · PB10', 'DHT11 OUT (ряд 34)', { lift: 0.6 }),
  W('n-gnd', 'GND', socketPos('GND', 'CN6'), rail('R-', 3), 'CN5-6 · GND', 'задня шина GND', { lift: 0.75 }),
  W('n-sda', 'PB9', socketPos('D14', 'CN5'), hole(42, 'j'), 'CN5-9 · D14 · PB9', 'шина SDA (ряд 42)', { lift: 0.85 }),
  W('n-scl', 'PB8', socketPos('D15', 'CN5'), hole(43, 'j'), 'CN5-10 · D15 · PB8', 'шина SCL (ряд 43)', { lift: 0.95 }),

  // ── SW1 (rows 28 / 30): pin 3–4 side → GND ───────────────────────────
  W('sw-gnd', 'GND', hole(30, 'j'), rail('R-', 28), 'SW1 виводи 3–4 (ряд 30)', 'задня шина GND', { lift: STAPLE }),

  // ── DHT11 module (f34–f36: OUT, −, +) ────────────────────────────────
  W('dht-gnd', 'GND', hole(35, 'j'), rail('R-', 32), 'DHT11 − (ряд 35)', 'задня шина GND', { lift: STAPLE }),
  W('dht-vcc', '+3V3', hole(36, 'j'), rail('R+', 33), 'DHT11 + (ряд 36)', 'задня шина +3V3', { lift: STAPLE }),

  // ── BMP280 (f40–f45): staples only, its SDA / SCL rows are the bus ────
  W('bmp-sdo', 'GND', hole(40, 'j'), rail('R-', 37), 'BMP280 SDO (ряд 40)', 'задня шина GND (адреса 0x76)', { lift: STAPLE }),
  W('bmp-csb', '+3V3', hole(41, 'j'), rail('R+', 38), 'BMP280 CSB (ряд 41)', 'задня шина +3V3 (режим I²C)', { lift: STAPLE }),
  W('bmp-gnd', 'GND', hole(44, 'j'), rail('R-', 42), 'BMP280 GND (ряд 44)', 'задня шина GND', { lift: STAPLE }),
  W('bmp-vcc', '+3V3', hole(45, 'j'), rail('R+', 43), 'BMP280 VCC (ряд 45)', 'задня шина +3V3', { lift: STAPLE }),

  // ── HW-084 J1 (female–male Dupont): straight down into rows 48–50 / rails ──
  W('hw-sqw', 'PB5', hwJ1('SQW'), hole(48, 'j'), 'HW-084 J1 SQW', 'ряд 48', { fromDir: HW_DIR, lift: 0.3 }),
  W('hw-scl', 'PB8', hwJ1('SCL'), hole(49, 'j'), 'HW-084 J1 SCL', 'ряд 49', { fromDir: HW_DIR, lift: 0.3 }),
  W('hw-sda', 'PB9', hwJ1('SDA'), hole(50, 'j'), 'HW-084 J1 SDA', 'ряд 50', { fromDir: HW_DIR, lift: 0.3 }),
  W('hw-vcc', '+3V3', hwJ1('VCC'), rail('R+', 49), 'HW-084 J1 VCC', 'задня шина +3V3 (тільки 3.3 V!)', { fromDir: HW_DIR, lift: 0.25 }),
  W('hw-gnd', 'GND', hwJ1('GND'), rail('R-', 50), 'HW-084 J1 GND', 'задня шина GND', { fromDir: HW_DIR, lift: 0.25 }),

  // ── flat lanes along the rows: SQW to D4, HW-084 rows to the bus ─────
  W('lane-sqw', 'PB5', hole(48, 'g'), hole(33, 'g'), 'ряд 48 (HW-084 SQW)', 'ряд 33 → D4', lane(hole(48, 'g'), hole(33, 'g'))),
  W('lane-scl', 'PB8', hole(49, 'h'), hole(43, 'h'), 'ряд 49 (HW-084 SCL)', 'шина SCL (ряд 43)', lane(hole(49, 'h'), hole(43, 'h'))),
  W('lane-sda', 'PB9', hole(50, 'i'), hole(42, 'i'), 'ряд 50 (HW-084 SDA)', 'шина SDA (ряд 42)', lane(hole(50, 'i'), hole(42, 'i'))),

  // ── OLED (f55–f58): staples + lanes onto the HW-084 rows ─────────────
  W('oled-gnd', 'GND', hole(55, 'j'), rail('R-', 52), 'OLED GND (ряд 55)', 'задня шина GND', { lift: STAPLE }),
  W('oled-vcc', '+3V3', hole(56, 'j'), rail('R+', 54), 'OLED VCC (ряд 56)', 'задня шина +3V3', { lift: STAPLE }),
  W('oled-scl', 'PB8', hole(57, 'g'), hole(49, 'g'), 'OLED SCL (ряд 57)', 'ряд 49 → шина SCL', lane(hole(57, 'g'), hole(49, 'g'))),
  W('oled-sda', 'PB9', hole(58, 'h'), hole(50, 'h'), 'OLED SDA (ряд 58)', 'ряд 50 → шина SDA', lane(hole(58, 'h'), hole(50, 'h'))),
]
