import { useBoardStore } from '../store/useBoardStore'
import { createSensors } from './sensors'
import { createFrame } from './ssd1306'
import { eepromRead, eepromWrite, rtcAlarmDue, rtcGetTime, rtcSetAlarm1 } from './devices'

/**
 * Minimal mock of the STM32 HAL plus the drivers the firmware calls. Each instance lives for
 * one simulation run and is torn down via `dispose()` (or the AbortSignal).
 *
 * Sensor values come from sensors.js (BMP280 over I²C, DHT11 on PB10), the DS3231 clock and
 * the AT24C32 EEPROM from devices.js (they keep their state between runs), the SSD1306 frame
 * buffer from ssd1306.js. Extend as the firmware grows.
 */
export function createHAL(signal) {
  const store = useBoardStore.getState
  const t0 = performance.now()
  const extiHandlers = new Map() // pin → callback
  const sensors = createSensors(() => store().env)
  const frame = createFrame()

  // Mock NVIC: watch GPIO levels and fire EXTI callbacks on falling edges.
  const unsubscribe = useBoardStore.subscribe((state, prev) => {
    for (const [pin, cb] of extiHandlers) {
      if (prev.gpio[pin] === 1 && state.gpio[pin] === 0) cb(pin)
    }
  })

  // DS3231 SQW: open-drain, pulled up on the module; goes low when Alarm 1 matches (PB5 / D4).
  const sqwPoll = setInterval(() => {
    if (rtcAlarmDue()) store().writePin('PB5', 0)
  }, 100)

  const dispose = () => {
    unsubscribe()
    clearInterval(sqwPoll)
    extiHandlers.clear()
  }
  signal.addEventListener('abort', dispose, { once: true })

  /** I²C transfer time at 100 kHz: 9 clocks per byte. */
  const i2cMs = (bytes) => Math.ceil(bytes * 0.09)

  return {
    dispose,

    Init() {
      for (const pin of ['PA5', 'PA8']) store().writePin(pin, 0) // outputs low after reset
    },

    GetTick: () => Math.floor(performance.now() - t0),

    /** Abortable HAL_Delay — the only place where the firmware yields for real. */
    Delay(ms) {
      return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(signal.reason)
        const id = setTimeout(resolve, ms)
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(id)
            reject(signal.reason)
          },
          { once: true },
        )
      })
    },

    /** Short pause so the init sequence is visible in the code viewer. */
    step(ms = 180) {
      return this.Delay(ms)
    },

    /** `pull: 'PULLUP'` drives the idle level high, like the internal pull-up does. */
    GPIO_Init(pin, mode, extiCallback, pull) {
      if (mode.startsWith('IT_') && extiCallback) extiHandlers.set(pin, extiCallback)
      if (pull === 'PULLUP') store().writePin(pin, 1)
    },
    GPIO_WritePin: (pin, value) => store().writePin(pin, value),
    GPIO_ReadPin: (pin) => store().readPin(pin),
    GPIO_TogglePin: (pin) => store().writePin(pin, !store().readPin(pin)),

    /**
     * BMP280 on I²C1 (0x76): forced-mode measurement + compensated read-out.
     * ~10 ms bus/conversion time at 100 kHz.
     */
    async BMP280_Read() {
      await this.Delay(10)
      return sensors.bmp280()
    },

    /**
     * DHT11 on PB10: start pulse (18 ms) + 40-bit frame (~4 ms).
     */
    async DHT11_Read() {
      await this.Delay(22)
      return sensors.dht11()
    },

    I2C_Init() {},

    // ── DS3231 (I²C 0x68) ──
    /** Date, time and Unix seconds (a 7-byte register read, ~1 ms: not worth yielding for). */
    RTC_GetTime: () => rtcGetTime(),
    /** Alarm 1 on minutes + seconds. Also clears A1F, so SQW (PB5) is released high again. */
    RTC_SetAlarm1(min, sec) {
      rtcSetAlarm1(min, sec)
      store().writePin('PB5', 1)
    },

    // ── AT24C32 (I²C 0x57, 16-bit memory addresses) ──
    async EEPROM_Read(addr, len) {
      await this.Delay(i2cMs(len))
      return eepromRead(addr, len)
    },
    async EEPROM_Write(addr, bytes) {
      await this.Delay(i2cMs(bytes.length))
      eepromWrite(addr, bytes)
    },

    // ── SSD1306 (I²C 0x3C), 128×64 pixels ──
    // Drawing goes to a local frame buffer; nothing is visible until OLED_Update().
    OLED_Init() {
      frame.fill(0)
      store().setOled(frame.snapshot())
    },
    OLED_Fill: (color) => frame.fill(color),
    OLED_SetCursor: (x, y) => frame.setCursor(x, y),
    /** 6×8 font: 21 columns × 8 rows when the cursor is snapped to the cell grid. */
    OLED_WriteString: (text) => frame.writeString(text),
    OLED_Line: (x0, y0, x1, y1) => frame.line(x0, y0, x1, y1),
    OLED_DrawPixel: (x, y) => frame.pixel(x, y),
    /** Frame transfer: 1 KiB over I²C ≈ 25 ms (400 kHz). */
    async OLED_Update() {
      await this.Delay(25)
      store().setOled(frame.snapshot())
    },

    UART_Init() {},
    UART_Transmit: (text) => store().serialPrint(text),

    /** Simulator-only diagnostics, shown dimmed in the Serial Monitor. */
    debug: (text) => store().serialPrint(`· ${text}`),
  }
}
