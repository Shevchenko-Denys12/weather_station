import { useBoardStore } from '../store/useBoardStore'

/**
 * Minimal mock of the STM32 HAL. Each instance lives for one simulation
 * run and is torn down via `dispose()` (or the AbortSignal).
 *
 * Only what the demo firmware needs is implemented; extend it as your
 * real firmware grows (ADC, PWM, I2C sensors for the weather station…).
 */
export function createHAL(signal) {
  const store = useBoardStore.getState
  const t0 = performance.now()
  const extiHandlers = new Map() // pin → callback

  // Mock NVIC: watch GPIO levels and fire EXTI callbacks on falling edges.
  const unsubscribe = useBoardStore.subscribe((state, prev) => {
    for (const [pin, cb] of extiHandlers) {
      if (prev.gpio[pin] === 1 && state.gpio[pin] === 0) cb(pin)
    }
  })

  const dispose = () => {
    unsubscribe()
    extiHandlers.clear()
  }
  signal.addEventListener('abort', dispose, { once: true })

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

    GPIO_Init(pin, mode, extiCallback) {
      if (mode.startsWith('IT_') && extiCallback) extiHandlers.set(pin, extiCallback)
    },
    GPIO_WritePin: (pin, value) => store().writePin(pin, value),
    GPIO_ReadPin: (pin) => store().readPin(pin),
    GPIO_TogglePin: (pin) => store().writePin(pin, !store().readPin(pin)),

    UART_Init() {},
    UART_Transmit: (text) => store().serialPrint(text),

    /** Simulator-only diagnostics, shown dimmed in the Serial Monitor. */
    debug: (text) => store().serialPrint(`· ${text}`),
  }
}
