import { useBoardStore } from '../store/useBoardStore'
import { createHAL } from './hal'
import { lineOf, main } from './firmware'

/**
 * Simulation lifecycle: run / stop / reset. Only one run at a time.
 */
let controller = null
let running = null // Promise of the current run

export function runFirmware() {
  if (controller) return running

  controller = new AbortController()
  const { signal } = controller
  const s = useBoardStore.getState()
  s.resetBoard()
  s.setStatus('running')

  const HAL = createHAL(signal)
  const at = (snippet, nth) => useBoardStore.getState().setActiveLine(lineOf(snippet, nth))

  running = main({ HAL, at, signal })
    .catch((err) => {
      if (err?.name !== 'AbortError') {
        useBoardStore.getState().serialPrint(`!! HardFault: ${err.message}`)
        console.error(err)
      }
    })
    .finally(() => {
      HAL.dispose()
      controller = null
      running = null
      const st = useBoardStore.getState()
      st.setStatus('idle')
      st.resetBoard()
    })

  return running
}

export function stopFirmware() {
  controller?.abort(new DOMException('Simulation stopped', 'AbortError'))
  return running ?? Promise.resolve()
}

/** B2 / NRST: restart the firmware if it was running. */
export async function resetMcu() {
  const wasRunning = Boolean(controller)
  await stopFirmware()
  useBoardStore.getState().serialPrint('· NRST — system reset')
  if (wasRunning) runFirmware()
}

/** B1 click: short active-low pulse on PC13. */
export function pressUserButton(ms = 140) {
  const { writePin } = useBoardStore.getState()
  writePin('PC13', 0)
  setTimeout(() => useBoardStore.getState().writePin('PC13', 1), ms)
}

/** SW1 click (D2 / PA10, pull-up): short active-low pulse; only meaningful while the firmware runs. */
export function pressSw1(ms = 120) {
  if (useBoardStore.getState().status !== 'running') return
  useBoardStore.getState().writePin('PA10', 0)
  setTimeout(() => {
    if (useBoardStore.getState().status === 'running') useBoardStore.getState().writePin('PA10', 1)
  }, ms)
}
