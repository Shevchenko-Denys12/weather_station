import { useBoardStore } from '../store/useBoardStore'
import { useResizable } from '../hooks/useResizable'
import { resetMcu, runFirmware, stopFirmware } from '../simulator/runtime'
import { SIGNAL_MCU_PIN, SIGNAL_PIN } from './circuit/LedCircuit'
import CodeViewer from './sidebar/CodeViewer'
import EnvironmentPanel from './sidebar/EnvironmentPanel'
import SerialMonitor from './sidebar/SerialMonitor'

/**
 * Right-hand panel: firmware viewer, run controls, ambient-environment sliders and serial output.
 * The code / serial split is draggable; `onCollapse` hides the whole panel.
 */
export default function Sidebar({ onCollapse }) {
  const running = useBoardStore((s) => s.status === 'running')
  const led = useBoardStore((s) => s.gpio[SIGNAL_MCU_PIN])
  const [serialH, splitter] = useResizable({
    storageKey: 'nucleo.serialHeight',
    initial: 224,
    min: 96,
    max: () => window.innerHeight - 320,
    axis: 'y',
  })

  return (
    <aside className="pointer-events-auto flex h-full w-full flex-col gap-3 border-l border-ink-700 bg-ink-900/85 p-4 backdrop-blur-md">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Firmware</h2>
          <p className="text-xs text-slate-500">прошито через ST-LINK/V2-1</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip running={running} />
          {onCollapse && (
            <button
              onClick={onCollapse}
              title="Сховати панель коду"
              aria-label="Сховати панель коду"
              className="hidden rounded p-1 text-slate-500 transition hover:bg-ink-800 hover:text-slate-200 md:block"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <CodeViewer />

      <div className="flex items-center gap-2">
        <button
          onClick={() => (running ? stopFirmware() : runFirmware())}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition ${
            running
              ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/40 hover:bg-red-500/25'
              : 'bg-led text-ink-950 hover:brightness-110'
          }`}
        >
          {running ? <StopIcon /> : <PlayIcon />}
          {running ? 'Зупинити' : 'Запустити симуляцію'}
        </button>
        <button
          onClick={resetMcu}
          title="B2 · NRST"
          className="rounded-md px-3 py-2.5 text-sm text-slate-300 ring-1 ring-ink-600 transition hover:bg-ink-800"
        >
          Reset
        </button>
        <div
          title={`LED1 · ${SIGNAL_PIN} (${SIGNAL_MCU_PIN})`}
          className="flex items-center gap-1.5 rounded-md px-3 py-2.5 font-mono text-xs text-slate-400 ring-1 ring-ink-600"
        >
          <span className={`h-2.5 w-2.5 rounded-full transition ${led ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-slate-600'}`} />
          {SIGNAL_PIN}·{SIGNAL_MCU_PIN}
        </div>
      </div>

      <EnvironmentPanel />

      {/* drag to trade code-viewer height for serial-monitor height */}
      <div
        {...splitter}
        aria-label="Змінити висоту Serial Monitor"
        title="Перетягніть, щоб змінити висоту · подвійний клік: скинути"
        className="group -my-2 flex h-3 shrink-0 cursor-row-resize items-center justify-center outline-none"
      >
        <span className="h-1 w-10 rounded-full bg-ink-600 transition group-hover:bg-accent group-focus-visible:bg-accent" />
      </div>

      <SerialMonitor height={serialH} />
    </aside>
  )
}

function StatusChip({ running }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] ${
        running ? 'bg-led/10 text-led' : 'bg-ink-800 text-slate-500'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${running ? 'animate-pulse bg-led' : 'bg-slate-600'}`} />
      {running ? 'RUNNING' : 'HALTED'}
    </span>
  )
}

const PlayIcon = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
    <path d="M4 2.5v11l9-5.5z" />
  </svg>
)
const StopIcon = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
    <rect x="3.5" y="3.5" width="9" height="9" rx="1" />
  </svg>
)
