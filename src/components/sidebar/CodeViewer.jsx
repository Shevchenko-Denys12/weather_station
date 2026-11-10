import { memo, useEffect, useRef } from 'react'
import { useBoardStore } from '../../store/useBoardStore'
import { FILE_NAME, SOURCE_LINES } from '../../simulator/firmware'

/**
 * Read-only C viewer with a tiny regex highlighter and the
 * "currently executing" line driven by the simulator.
 */
export default function CodeViewer() {
  const activeLine = useBoardStore((s) => s.activeLine)
  const running = useBoardStore((s) => s.status === 'running')
  const scroller = useRef(null)

  // keep the active line in view while the simulation runs
  useEffect(() => {
    if (!running || !activeLine || !scroller.current) return
    const el = scroller.current.querySelector(`[data-line="${activeLine}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeLine, running])

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-ink-700 bg-ink-950">
      <header className="flex items-center gap-2 border-b border-ink-700 px-3 py-2 font-mono text-[11px] text-slate-400">
        <span className="h-2 w-2 rounded-full bg-st" />
        {FILE_NAME}
        <span className="ml-auto text-slate-600">C · HAL</span>
      </header>
      <div ref={scroller} className="scroll-thin min-h-0 flex-1 overflow-auto py-2 font-mono text-[12px] leading-[1.6]">
        {SOURCE_LINES.map((text, i) => (
          <CodeLine key={i} n={i + 1} text={text} active={i + 1 === activeLine} />
        ))}
      </div>
    </section>
  )
}

const CodeLine = memo(function CodeLine({ n, text, active }) {
  return (
    <div
      data-line={n}
      className={`flex pr-4 transition-colors duration-100 ${
        active ? 'bg-led/10 shadow-[inset_2px_0_0_var(--color-led)]' : ''
      }`}
    >
      <span className={`w-10 shrink-0 select-none pr-3 text-right ${active ? 'text-led' : 'text-slate-600'}`}>{n}</span>
      <code className="whitespace-pre text-slate-300">{highlight(text)}</code>
    </div>
  )
})

// ── minimal C highlighter ────────────────────────────────────────────
const TOKEN =
  /(\/\/.*$|\/\*.*?\*\/|\/\*.*$|^\s*\*.*$)|("(?:\\.|[^"\\])*")|(#\s*\w+)|\b(int|char|void|static|volatile|const|while|if|else|return|sizeof|uint8_t|uint16_t|uint32_t|GPIO_PinState|UART_HandleTypeDef|GPIO_InitTypeDef)\b|\b(HAL_\w+|MX_\w+|__HAL_\w+|SystemClock_Config|snprintf|strlen)\b|\b([A-Z][A-Z0-9_]{2,})\b|\b(\d+)\b/g

const CLASSES = [
  'text-slate-500 italic', // comment
  'text-amber-300', // string
  'text-fuchsia-400', // preprocessor
  'text-sky-400', // keyword / type
  'text-emerald-300', // HAL call
  'text-orange-300', // MACRO
  'text-violet-300', // number
]

function highlight(line) {
  const out = []
  let last = 0
  for (const m of line.matchAll(TOKEN)) {
    if (m.index > last) out.push(line.slice(last, m.index))
    const group = m.slice(1).findIndex((g) => g !== undefined)
    out.push(
      <span key={m.index} className={CLASSES[group]}>
        {m[0]}
      </span>,
    )
    last = m.index + m[0].length
  }
  if (last < line.length) out.push(line.slice(last))
  return out.length ? out : ' '
}
