import { useState } from 'react'
import ArduinoScene from './components/ArduinoScene'
import InfoPanel from './components/InfoPanel'
import Sidebar from './components/Sidebar'
import CameraToolbar from './components/camera/CameraToolbar'
import { useBoardStore } from './store/useBoardStore'
import { useResizable } from './hooks/useResizable'

const COLLAPSE_KEY = 'nucleo.sidebarCollapsed'

/**
 * Layout: 3D viewport (left) with floating overlays, code/serial sidebar (right).
 * The sidebar width is draggable on desktop and the panel can be collapsed.
 * Overlay wrappers are pointer-events-none so the canvas stays interactive
 * everywhere except over the cards themselves.
 */
export default function App() {
  const [width, resizer] = useResizable({
    storageKey: 'nucleo.sidebarWidth',
    initial: 460,
    min: 320,
    max: () => Math.min(window.innerWidth * 0.7, window.innerWidth - 360),
  })
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const setPanel = (value) => {
    setCollapsed(value)
    try {
      localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
    } catch {
      /* not persisted */
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden md:flex-row">
      <main className="relative min-h-[55vh] flex-1 md:min-h-0">
        <div className="absolute inset-0">
          <ArduinoScene />
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <TitleBlock />
            {collapsed && (
              <button
                onClick={() => setPanel(false)}
                className="pointer-events-auto hidden items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900/85 px-3 py-1.5 text-xs text-slate-300 backdrop-blur transition hover:text-white md:flex"
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 3.5 5.5 8 10 12.5" />
                </svg>
                Код і Serial
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <InfoPanel />
            <CameraToolbar />
          </div>
        </div>
      </main>

      <div
        style={{ '--sb-w': `${width}px` }}
        className={`relative h-[60vh] shrink-0 md:h-full md:w-[var(--sb-w)] ${collapsed ? 'md:hidden' : ''}`}
      >
        {/* drag handle on the left edge (desktop) */}
        <div
          {...resizer}
          aria-label="Змінити ширину панелі коду"
          title="Перетягніть, щоб змінити ширину · подвійний клік: скинути"
          className="group absolute inset-y-0 -left-1.5 z-10 hidden w-3 cursor-col-resize outline-none md:block"
        >
          <div className="mx-auto h-full w-px bg-ink-700 transition-all group-hover:w-0.5 group-hover:bg-accent group-focus-visible:w-0.5 group-focus-visible:bg-accent" />
        </div>
        <Sidebar onCollapse={() => setPanel(true)} />
      </div>
    </div>
  )
}

function TitleBlock() {
  return (
    <div className="pointer-events-auto select-none">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-st">STM32 · Nucleo-64</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">NUCLEO-F411RE</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-400">
        Інтерактивна 3D-модель плати та симулятор прошивки на HAL.
      </p>
      <LabelToggles />
    </div>
  )
}

const LAYERS = [
  ['arduino', 'Arduino'],
  ['morpho', 'Morpho'],
  ['mcu', 'MCU'],
]

/** Show / hide pin label layers on the board. */
function LabelToggles() {
  const labels = useBoardStore((s) => s.labels)
  const toggle = useBoardStore((s) => s.toggleLabels)
  return (
    <div className="mt-3 flex items-center gap-1.5">
      <span className="mr-1 text-[11px] text-slate-500">Підписи пінів</span>
      {LAYERS.map(([key, name]) => (
        <button
          key={key}
          onClick={() => toggle(key)}
          aria-pressed={labels[key]}
          className={`rounded px-2 py-0.5 font-mono text-[11px] ring-1 transition ${
            labels[key] ? 'bg-accent/15 text-accent ring-accent/40' : 'text-slate-500 ring-ink-600 hover:text-slate-300'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  )
}
