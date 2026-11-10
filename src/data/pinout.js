/**
 * Complete pinout of the NUCLEO-F411RE: STM32F411RET6 (LQFP64), ST morpho
 * CN7/CN10 and Arduino Uno V3 CN5/CN6/CN8/CN9 (UM1724, DS10314).
 *
 * Every pin becomes a record in PINS with a world position, so the 3D
 * model, tooltips, info cards and the breadboard wiring all share it.
 */
import { BOARD_TOP, FEMALE_HEADER_H, HEADER_X, MCU_BODY, MCU_CENTER, MCU_PITCH, PITCH, rowZ } from './layout'
import { MODULES, toWorld } from './modules'
import { MODULE_NETS } from './netlist'

// ── STM32F411RET6, LQFP64, pin 1 … 64 (counter-clockwise from top-left) ──
export const MCU_PINS = [
  'VBAT', 'PC13', 'PC14', 'PC15', 'PH0', 'PH1', 'NRST', 'PC0',
  'PC1', 'PC2', 'PC3', 'VSSA', 'VDDA', 'PA0', 'PA1', 'PA2',
  'PA3', 'VSS', 'VDD', 'PA4', 'PA5', 'PA6', 'PA7', 'PC4',
  'PC5', 'PB0', 'PB1', 'PB2', 'PB10', 'VCAP1', 'VSS', 'VDD',
  'PB12', 'PB13', 'PB14', 'PB15', 'PC6', 'PC7', 'PC8', 'PC9',
  'PA8', 'PA9', 'PA10', 'PA11', 'PA12', 'PA13', 'VSS', 'VDD',
  'PA14', 'PA15', 'PC10', 'PC11', 'PC12', 'PD2', 'PB3', 'PB4',
  'PB5', 'PB6', 'PB7', 'BOOT0', 'PB8', 'PB9', 'VSS', 'VDD',
]

// ── ST morpho, pin 1 … 38 (odd = left column, even = right column) ──
const MORPHO = {
  CN7: [
    'PC10', 'PC11', 'PC12', 'PD2', 'VDD', 'E5V', 'BOOT0', 'GND', 'NC', 'NC',
    'NC', 'IOREF', 'PA13', 'RESET', 'PA14', '+3V3', 'PA15', '+5V', 'GND', 'GND',
    'PB7', 'GND', 'PC13', 'VIN', 'PC14', 'NC', 'PC15', 'PA0', 'PH0', 'PA1',
    'PH1', 'PA4', 'VBAT', 'PB0', 'PC2', 'PC1', 'PC3', 'PC0',
  ],
  CN10: [
    'PC9', 'PC8', 'PB8', 'PC6', 'PB9', 'PC5', 'AVDD', 'U5V', 'GND', 'NC',
    'PA5', 'PA12', 'PA6', 'PA11', 'PA7', 'PB12', 'PB6', 'NC', 'PC7', 'GND',
    'PA9', 'PB2', 'PA8', 'PB1', 'PB10', 'PB15', 'PB4', 'PB14', 'PB5', 'PB13',
    'PB3', 'AGND', 'PA10', 'PC4', 'PA2', 'NC', 'PA3', 'NC',
  ],
}

// ── Arduino Uno V3, pin 1 … n: [arduino name, signal, silkscreen] ──
const ARDUINO = {
  CN6: [
    ['NC', 'NC', ''], ['IOREF', 'IOREF', 'IOREF'], ['RESET', 'NRST', 'NRST'], ['3V3', '+3V3', '3V3'],
    ['5V', '+5V', '5V'], ['GND', 'GND', 'GND'], ['GND', 'GND', 'GND'], ['VIN', 'VIN', 'VIN'],
  ],
  CN8: [
    ['A0', 'PA0', 'A0'], ['A1', 'PA1', 'A1'], ['A2', 'PA4', 'A2'],
    ['A3', 'PB0', 'A3'], ['A4', 'PC1', 'A4'], ['A5', 'PC0', 'A5'],
  ],
  CN5: [
    ['D8', 'PA9', 'D8'], ['D9', 'PC7', 'PWM/D9'], ['D10', 'PB6', 'PWM/CS/D10'], ['D11', 'PA7', 'PWM/MOSI/D11'],
    ['D12', 'PA6', 'MISO/D12'], ['D13', 'PA5', 'SCK/D13'], ['GND', 'GND', 'GND'], ['AVDD', 'AVDD', 'AVDD'],
    ['D14', 'PB9', 'SDA/D14'], ['D15', 'PB8', 'SCL/D15'],
  ],
  CN9: [
    ['D0', 'PA3', 'RX/D0'], ['D1', 'PA2', 'TX/D1'], ['D2', 'PA10', 'D2'], ['D3', 'PB3', 'PWM/D3'],
    ['D4', 'PB5', 'D4'], ['D5', 'PB4', 'PWM/D5'], ['D6', 'PB10', 'PWM/D6'], ['D7', 'PA8', 'D7'],
  ],
}

/** Z of Arduino socket k (1-based) — aligned to the morpho row grid. */
const ARDUINO_ROW = {
  CN6: (k) => k + 4, // pin 1 ↔ CN7 row 5
  CN8: (k) => k + 13, // pin 1 ↔ CN7 row 14
  CN5: (k) => 11.5 - k, // pin 1 (D8) half a pitch above CN9
  CN9: (k) => 20 - k, // pin 8 (D7) ↔ row 12, pin 1 (D0) ↔ row 19
}

export const GROUP_INFO = {
  CN7: { name: 'ST morpho CN7', kind: 'morpho' },
  CN10: { name: 'ST morpho CN10', kind: 'morpho' },
  CN5: { name: 'Arduino CN5 (D8–D15)', kind: 'arduino' },
  CN6: { name: 'Arduino CN6 (power)', kind: 'arduino' },
  CN8: { name: 'Arduino CN8 (analog)', kind: 'arduino' },
  CN9: { name: 'Arduino CN9 (D0–D7)', kind: 'arduino' },
  U7: { name: 'STM32F411RET6 · LQFP64', kind: 'mcu' },
  ...Object.fromEntries(Object.entries(MODULES).map(([g, m]) => [g, { name: m.name, kind: 'module' }])),
}

// ── nets ────────────────────────────────────────────────────────────
const isGpio = (s) => /^P[A-H]\d+$/.test(s)

/** Signal name → electrical net (pins on the same net highlight together). */
export function netOf(signal) {
  if (isGpio(signal)) return signal
  switch (signal) {
    case 'GND': case 'AGND': case 'VSS': case 'VSSA': return 'GND'
    case 'RESET': case 'NRST': return 'NRST'
    case '+3V3': case '3V3': case 'IOREF': return '+3V3'
    case '+5V': case '5V': return '+5V'
    case 'AVDD': case 'VDDA': return 'VDDA'
    case 'NC': return null
    default: return signal // VDD, E5V, U5V, VIN, BOOT0, VBAT, VCAP1
  }
}

export function kindOf(signal) {
  if (isGpio(signal)) return 'gpio'
  const net = netOf(signal)
  if (net === 'GND') return 'gnd'
  if (net === null) return 'nc'
  if (net === 'NRST' || net === 'BOOT0') return 'ctrl'
  return 'power'
}

// ── main alternate functions (DS10314, table 9) ─────────────────────
export const ALT_FUNCTIONS = {
  PA0: ['TIM2_CH1/ETR', 'TIM5_CH1', 'USART2_CTS', 'ADC1_IN0', 'WKUP'],
  PA1: ['TIM2_CH2', 'TIM5_CH2', 'SPI4_MOSI', 'USART2_RTS', 'ADC1_IN1'],
  PA2: ['TIM2_CH3', 'TIM5_CH3', 'TIM9_CH1', 'USART2_TX', 'ADC1_IN2'],
  PA3: ['TIM2_CH4', 'TIM5_CH4', 'TIM9_CH2', 'USART2_RX', 'ADC1_IN3'],
  PA4: ['SPI1_NSS', 'SPI3_NSS/I2S3_WS', 'USART2_CK', 'ADC1_IN4'],
  PA5: ['TIM2_CH1/ETR', 'SPI1_SCK', 'ADC1_IN5'],
  PA6: ['TIM1_BKIN', 'TIM3_CH1', 'SPI1_MISO', 'ADC1_IN6'],
  PA7: ['TIM1_CH1N', 'TIM3_CH2', 'SPI1_MOSI', 'ADC1_IN7'],
  PA8: ['MCO_1', 'TIM1_CH1', 'I2C3_SCL', 'USART1_CK', 'USB_FS_SOF'],
  PA9: ['TIM1_CH2', 'I2C3_SMBA', 'USART1_TX', 'USB_FS_VBUS'],
  PA10: ['TIM1_CH3', 'USART1_RX', 'USB_FS_ID'],
  PA11: ['TIM1_CH4', 'USART1_CTS', 'USART6_TX', 'USB_FS_DM'],
  PA12: ['TIM1_ETR', 'USART1_RTS', 'USART6_RX', 'USB_FS_DP'],
  PA13: ['SWDIO'],
  PA14: ['SWCLK'],
  PA15: ['JTDI', 'TIM2_CH1/ETR', 'SPI1_NSS', 'SPI3_NSS', 'USART1_TX'],
  PB0: ['TIM1_CH2N', 'TIM3_CH3', 'ADC1_IN8'],
  PB1: ['TIM1_CH3N', 'TIM3_CH4', 'ADC1_IN9'],
  PB2: ['BOOT1'],
  PB3: ['SWO', 'TIM2_CH2', 'SPI1_SCK', 'SPI3_SCK', 'I2C2_SDA'],
  PB4: ['NJTRST', 'TIM3_CH1', 'SPI1_MISO', 'SPI3_MISO', 'I2C3_SDA'],
  PB5: ['TIM3_CH2', 'I2C1_SMBA', 'SPI1_MOSI', 'SPI3_MOSI'],
  PB6: ['TIM4_CH1', 'I2C1_SCL', 'USART1_TX'],
  PB7: ['TIM4_CH2', 'I2C1_SDA', 'USART1_RX'],
  PB8: ['TIM4_CH3', 'TIM10_CH1', 'I2C1_SCL', 'SDIO_D4'],
  PB9: ['TIM4_CH4', 'TIM11_CH1', 'I2C1_SDA', 'SPI2_NSS'],
  PB10: ['TIM2_CH3', 'I2C2_SCL', 'SPI2_SCK'],
  PB12: ['TIM1_BKIN', 'SPI2_NSS', 'SPI4_NSS'],
  PB13: ['TIM1_CH1N', 'SPI2_SCK', 'SPI4_SCK'],
  PB14: ['TIM1_CH2N', 'SPI2_MISO'],
  PB15: ['RTC_REFIN', 'TIM1_CH3N', 'SPI2_MOSI'],
  PC0: ['ADC1_IN10'],
  PC1: ['ADC1_IN11'],
  PC2: ['SPI2_MISO', 'ADC1_IN12'],
  PC3: ['SPI2_MOSI', 'ADC1_IN13'],
  PC4: ['ADC1_IN14'],
  PC5: ['ADC1_IN15'],
  PC6: ['TIM3_CH1', 'I2S2_MCK', 'USART6_TX', 'SDIO_D6'],
  PC7: ['TIM3_CH2', 'I2S3_MCK', 'USART6_RX', 'SDIO_D7'],
  PC8: ['TIM3_CH3', 'USART6_CK', 'SDIO_D0'],
  PC9: ['MCO_2', 'TIM3_CH4', 'I2C3_SDA', 'SDIO_D1'],
  PC10: ['SPI3_SCK', 'SDIO_D2'],
  PC11: ['SPI3_MISO', 'SDIO_D3'],
  PC12: ['SPI3_MOSI', 'SDIO_CK'],
  PC13: ['RTC_TAMP1'],
  PC14: ['OSC32_IN'],
  PC15: ['OSC32_OUT'],
  PD2: ['TIM3_ETR', 'SDIO_CMD'],
  PH0: ['OSC_IN'],
  PH1: ['OSC_OUT'],
}

/** What the Nucleo board itself wires to a net. */
export const BOARD_NOTES = {
  PA2: 'USART2_TX → ST-LINK Virtual COM (Serial Monitor)',
  PA3: 'USART2_RX ← ST-LINK Virtual COM',
  PA5: 'LD2, зелений користувацький LED',
  PC13: 'B1 USER, кнопка (активний LOW)',
  PA13: 'SWDIO → ST-LINK',
  PA14: 'SWCLK → ST-LINK',
  PB3: 'SWO → ST-LINK',
  PC14: 'X3, кварц 32.768 kHz (LSE)',
  PC15: 'X3, кварц 32.768 kHz (LSE)',
  PH0: 'MCO 8 MHz від ST-LINK (HSE bypass)',
  NRST: 'B2 RESET та ST-LINK',
  BOOT0: 'Підтягнутий до GND: старт з Flash',
  VCAP1: 'Конденсатор стабілізатора ядра (1.2 V)',
  VDD: 'Живлення МК 3.3 V (через JP6 IDD)',
  VDDA: 'Аналогове живлення / опорна напруга АЦП',
  VBAT: 'Живлення RTC/backup-домену, з’єднаний з VDD',
  E5V: 'Зовнішнє 5 V (вибір через JP5)',
  U5V: '5 V від USB ST-LINK',
  VIN: 'Вхід 7–12 V на регулятор',
  GND: 'Загальна земля',
  '+3V3': 'Вихід регулятора LD1117 3.3 V',
  '+5V': 'Шина 5 V плати',
}

const POWER_INFO = {
  gnd: 'Земля',
  power: 'Живлення',
  ctrl: 'Керування',
  nc: 'Не підключено',
}

// ── build the pin registry ──────────────────────────────────────────
const ARDUINO_BY_SIGNAL = {}
for (const pins of Object.values(ARDUINO))
  for (const [name, signal] of pins) if (isGpio(signal)) ARDUINO_BY_SIGNAL[signal] = name

function record(group, n, signal, extra) {
  const net = netOf(signal)
  const kind = kindOf(signal)
  const mcuIndex = isGpio(signal) ? MCU_PINS.indexOf(signal) + 1 : 0
  return {
    id: `${group}-${n}`,
    group,
    n,
    signal,
    net,
    kind,
    kindLabel: kind === 'gpio' ? 'GPIO' : POWER_INFO[kind],
    mcuPin: mcuIndex || null,
    arduino: ARDUINO_BY_SIGNAL[signal] ?? null,
    ...extra,
  }
}

function buildPins() {
  const pins = []

  // morpho: odd pins at −X column, even at +X column, rows top → bottom
  for (const [group, list] of Object.entries(MORPHO)) {
    list.forEach((signal, i) => {
      const n = i + 1
      const odd = n % 2 === 1
      const x = HEADER_X[group] + (odd ? -PITCH / 2 : PITCH / 2)
      const z = rowZ(Math.ceil(n / 2))
      pins.push(record(group, n, signal, { label: signal, pos: [x, BOARD_TOP, z], odd }))
    })
  }

  // arduino sockets
  for (const [group, list] of Object.entries(ARDUINO)) {
    list.forEach(([name, signal, silk], i) => {
      const n = i + 1
      const z = rowZ(ARDUINO_ROW[group](n))
      pins.push(
        record(group, n, signal, {
          label: name,
          silk,
          arduino: name,
          pos: [HEADER_X[group], BOARD_TOP + FEMALE_HEADER_H, z],
        }),
      )
    })
  }

  // MCU: 16 pins per side, counter-clockwise starting top-left
  const [cx, cz] = MCU_CENTER
  const tip = MCU_BODY / 2 + 0.05
  const off = (k) => (k - 7.5) * MCU_PITCH // k = 0…15
  MCU_PINS.forEach((signal, i) => {
    const n = i + 1
    const k = i % 16
    let side, x, z
    if (n <= 16) [side, x, z] = ['L', cx - tip, cz + off(k)]
    else if (n <= 32) [side, x, z] = ['B', cx + off(k), cz + tip]
    else if (n <= 48) [side, x, z] = ['R', cx + tip, cz - off(k)]
    else [side, x, z] = ['T', cx - off(k), cz - tip]
    pins.push(record('U7', n, signal, { label: signal, pos: [x, BOARD_TOP, z], side, mcuPin: n }))
  })

  // library modules: nets are scoped to the module until it gets wired
  for (const [group, m] of Object.entries(MODULES)) {
    m.pins.forEach((p, i) => {
      const kind = p.kind ?? (p.name === 'GND' ? 'gnd' : p.name === 'VCC' ? 'power' : 'signal')
      pins.push({
        id: `${group}-${i + 1}`,
        group,
        n: i + 1,
        signal: p.name,
        label: p.name,
        // module-scoped net, replaced by the Nucleo net once wired (netlist.js)
        net: kind === 'nc' ? null : (MODULE_NETS[`${group}:${p.net ?? p.name}`] ?? `${group}:${p.net ?? p.name}`),
        kind,
        kindLabel: { gnd: 'Земля', power: 'Живлення', signal: 'Сигнал', nc: 'Не підключено' }[kind],
        mcuPin: null,
        arduino: null,
        header: p.header ?? null,
        note: m.notes[p.name] ?? null,
        local: p.at,
        pos: toWorld(group, p.at),
      })
    })
  }

  return pins
}

export const PINS = buildPins()
export const PIN_BY_ID = Object.fromEntries(PINS.map((p) => [p.id, p]))

/** net → ids of every pin on it */
export const NET_MEMBERS = PINS.reduce((acc, p) => {
  if (p.net) (acc[p.net] ??= []).push(p.id)
  return acc
}, {})

export const pinsOf = (group) => PINS.filter((p) => p.group === group)

/** Arduino name → STM32 pin (D7 → PA8). */
export const ARDUINO_TO_MCU = Object.fromEntries(
  Object.entries(ARDUINO_BY_SIGNAL).map(([signal, name]) => [name, signal]),
)

/**
 * World position of the top opening of an Arduino socket.
 * `group` disambiguates duplicated names such as GND.
 */
export function socketPos(name, group) {
  const pin = PINS.find((p) => p.arduino === name && GROUP_INFO[p.group].kind === 'arduino' && (!group || p.group === group))
  if (!pin) throw new Error(`pinout: unknown socket ${name}${group ? ` on ${group}` : ''}`)
  return pin.pos
}
