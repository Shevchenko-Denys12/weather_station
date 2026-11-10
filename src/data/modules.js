/**
 * External modules of the weather station and where they sit (C/README.md).
 *
 * Each module has a world `origin` (x, y = underside of its PCB / body, z),
 * a rotation `rotY` about the vertical axis and pins in module-local
 * coordinates. pinout.js turns these into regular pin records; netlist.js
 * says which Nucleo net each pin joins.
 *
 * Breadboard layout (rows increase to the right, see data/breadboard.js):
 * every breakout has its header in column f with the board overhanging the
 * front half (a–e), so all wiring stays in the back half (g–j) next to the
 * back rails R+ / R− and the Nucleo. Seen from the Nucleo side the order is
 * OLED → BMP280 → DHT11 → SW1, with HW-084 behind the breadboard.
 *
 *   rows 28/30  SW1 across the channel (D2 / GND)
 *   row  33     SQW junction (D4 ← lane from row 48)
 *   rows 34–36  DHT11 module  (OUT, −, +)
 *   rows 40–45  BMP280        (SDO, CSB, SDA, SCL, GND, VCC); its SDA / SCL rows
 *               42 / 43 are the I²C bus where D14 / D15 land
 *   rows 48–50  HW-084 J1 SQW / SCL / SDA drop straight down here (J1 VCC / GND → rails)
 *   rows 55–58  OLED          (GND, VCC, SCL, SDA), I²C chained via rows 49 / 50
 *
 * Units: 1 = 10 mm. Local axes before rotation: +X right, +Z toward the viewer.
 */
import { BOARD_BOTTOM, PITCH } from './layout'
import { BB_TOP, hole } from './breadboard'

const row = (n, i) => (i - (n - 1) / 2) * PITCH

/** 2.5 mm plastic spacer of a straight header: the PCB sits this high above the breadboard. */
export const HEADER_SPACER = 0.25

/** World X of a breadboard row and world Z of a column (rows run along X). */
const rowX = (r) => hole(r, 'f')[0]
const colZ = (c) => hole(1, c)[2]

export const MODULES = {
  // ── JMD0.96D-1: 0.96" SSD1306 128×64 I²C OLED ─────────────────────
  OLED: {
    id: 'oled',
    name: 'OLED JMD0.96D-1',
    pcb: { w: 2.73, l: 2.78, t: 0.12 },
    // header (local z −1.2) in f55…f58, screen upright toward the viewer
    origin: [rowX(56.5), BB_TOP + HEADER_SPACER, colZ('f') + 1.2],
    rotY: 0,
    header: 'straight',
    pins: ['GND', 'VCC', 'SCL', 'SDA'].map((name, i) => ({
      name,
      at: [row(4, i), 0.12, -1.2],
    })),
    notes: {
      GND: 'Земля модуля. Перемичка з j55 на задню шину GND.',
      VCC: 'Живлення 3.3–5 V (на модулі є LDO 3.3 V). Перемичка з j56 на задню шину +3V3.',
      SCL: 'I²C SCL. Адреса SSD1306: 0x3C (на деяких платах 0x3D). Доріжка g57 → g49 (ряд SCL від HW-084).',
      SDA: 'I²C SDA. Доріжка h58 → h50 (ряд SDA від HW-084).',
    },
  },

  // ── GY-BMP280-3.3: 15 × 11.5 mm purple breakout ───────────────────
  BMP280: {
    id: 'bmp280',
    name: 'GY-BMP280-3.3 · J1',
    pcb: { w: 1.5, l: 1.15, t: 0.16 },
    // header (local z +0.42) in f40…f45, board turned 180° so it overhangs the front half
    origin: [rowX(42.5), BB_TOP + HEADER_SPACER, colZ('f') + 0.42],
    rotY: Math.PI,
    header: 'straight',
    pins: ['VCC', 'GND', 'SCL', 'SDA', 'CSB', 'SDO'].map((name, i) => ({
      name,
      at: [row(6, i), 0.16, 0.42],
    })),
    notes: {
      VCC: 'Живлення 3.3 V. На цьому модулі немає регулятора, 5 V подавати не можна.',
      GND: 'Земля модуля.',
      SCL: 'I²C SCL / SPI SCK. Ряд 43 = шина SCL: сюди приходять D15 (PB8) і доріжка від HW-084.',
      SDA: 'I²C SDA / SPI SDI (MOSI). Ряд 42 = шина SDA: сюди приходять D14 (PB9) і доріжка від HW-084.',
      CSB: 'Chip select. HIGH = I²C (перемичка на +3V3), LOW = SPI.',
      SDO: 'I²C адреса: GND = 0x76 (перемичка на GND), VCC = 0x77. У режимі SPI: SDO (MISO).',
    },
  },

  // ── DHT11 module: sensor on a small PCB with pull-up, cap and power LED ──
  // PCB ≈ 12.7 × 28.5 mm, 3-pin header "+ − OUT" at one end, sensor lying flat
  // (grille up) at the other.
  DHT11: {
    id: 'dht11',
    name: 'DHT11 (модуль, 3 виводи)',
    pcb: { w: 1.27, l: 2.85, t: 0.16 },
    // header (local z +1.27) in f34…f36, turned 180° so the sensor overhangs the front half
    origin: [rowX(35), BB_TOP + HEADER_SPACER, colZ('f') + 1.27],
    rotY: Math.PI,
    header: 'straight',
    pins: [
      { name: '+', kind: 'power', at: [-PITCH, 0.16, 1.27] },
      { name: '-', kind: 'gnd', at: [0, 0.16, 1.27] },
      { name: 'OUT', kind: 'signal', at: [PITCH, 0.16, 1.27] },
    ],
    notes: {
      '+': 'Живлення 3.3–5.5 V. Від 3.3 V Nucleo: тоді й рівень на OUT безпечний для МК.',
      '-': 'Земля.',
      OUT: 'Лінія даних DHT11 (власний однопровідний протокол Aosong). Підтяжка ≈ 10 kΩ і конденсатор уже стоять на модулі. МК тягне лінію в LOW ≥ 18 мс, датчик відповідає 40 бітами: RH, T, контрольна сума. Підключено до D6 (PB10), open-drain.',
    },
  },

  // ── 12 × 12 mm tactile switch with round cap ──────────────────────
  SW1: {
    id: 'button',
    name: 'Кнопка 12×12 (SW1)',
    // straddles the channel: pins 1, 3 in the front half (d28, d30), pins 2, 4 in the back (g28, g30)
    origin: [rowX(29), BB_TOP + 0.35, (colZ('d') + colZ('g')) / 2],
    rotY: Math.PI / 2,
    header: 'legs',
    pins: [
      { name: '1', net: 'A', at: [-0.625, 0, -0.25] },
      { name: '2', net: 'A', at: [0.625, 0, -0.25] },
      { name: '3', net: 'B', at: [-0.625, 0, 0.25] },
      { name: '4', net: 'B', at: [0.625, 0, 0.25] },
    ],
    notes: {
      1: 'Пара 1–2 з’єднана всередині завжди (ряд 28). Натискання замикає її з парою 3–4.',
      2: 'Пара 1–2 з’єднана всередині завжди (ряд 28). Сюди приходить D2 (PA10).',
      3: 'Пара 3–4 з’єднана всередині завжди (ряд 30). Натискання замикає її з парою 1–2.',
      4: 'Пара 3–4 з’єднана всередині завжди (ряд 30). Перемичка на задню шину GND.',
    },
  },

  // ── HW-084: DS3231 RTC + AT24C32, 38 × 22 mm blue board ───────────
  HW084: {
    id: 'hw084',
    name: 'HW-084 (DS3231)',
    pcb: { w: 3.8, l: 2.2, t: 0.16 },
    // behind the breadboard on three standoffs at the Nucleo's height, J1 facing it;
    // J1 SCL lines up with row 49 so SQW / SCL / SDA drop straight into rows 48 / 49 / 50
    origin: [rowX(49) - (0.06 + row(6, 2)), BOARD_BOTTOM, 1.35],
    rotY: Math.PI / 2,
    header: 'right-angle',
    // J1 geometry (local): horizontal pins at y = pinY, female Dupont housings
    // slid over the pin ends from x = housing[0] to housing[1]; wires leave at housing[1]
    j1: { pinY: 0.16 + 0.125, pinOut: 0.74, housing: [-2.05, -3.4] },
    pins: [
      // J1: right-angle 6-pin header on the left edge (top → bottom)
      ...['32K', 'SQW', 'SCL', 'SDA', 'VCC', 'GND'].map((name, i) => ({
        name,
        at: [-1.8, 0.16 + 0.25, 0.06 + row(6, i)],
        header: 'J1',
      })),
      // J2: 4-pin pass-through for the next I²C device (holes only)
      ...['SCL', 'SDA', 'VCC', 'GND'].map((name, i) => ({
        name,
        at: [1.73, 0.16, -0.06 + row(4, i)],
        header: 'J2',
      })),
    ],
    notes: {
      '32K': 'Вихід 32.768 kHz (open-drain, потрібна підтяжка). Не підключається.',
      SQW: 'INT/SQW: переривання будильника, open-drain, активний LOW. Ряд 48 → доріжка g48 → g33 → D4 (PB5).',
      SCL: 'I²C SCL → ряд 49 → доріжка до шини (ряд 43). DS3231 = 0x68, EEPROM AT24C32 = 0x57 (перемички A0–A2: 0x50…0x57).',
      SDA: 'I²C SDA → ряд 50 → доріжка до шини (ряд 42). Підтяжки 4.7 kΩ уже є на модулі.',
      VCC: 'Живлення: тільки 3.3 V у цій схемі (підтяжки I²C модуля йдуть до його VCC).',
      GND: 'Земля модуля.',
    },
  },
}

/** World position of a module-local point (applies the module's rotY). */
export const toWorld = (group, [x, y, z]) => {
  const { origin: o, rotY = 0 } = MODULES[group]
  const c = Math.cos(rotY)
  const s = Math.sin(rotY)
  return [o[0] + x * c + z * s, o[1] + y, o[2] - x * s + z * c]
}

/** World direction of a module-local direction vector. */
export const dirToWorld = (group, [x, y, z]) => {
  const { rotY = 0 } = MODULES[group]
  const c = Math.cos(rotY)
  const s = Math.sin(rotY)
  return [x * c + z * s, y, -x * s + z * c]
}
