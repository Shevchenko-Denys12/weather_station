import { useEffect, useRef, useState } from 'react'
import { useBoardStore } from '../../store/useBoardStore'

/** USART2 output through the ST-LINK virtual COM port. */
export default function SerialMonitor({ height }) {
  const serial = useBoardStore((s) => s.serial)
  const clearSerial = useBoardStore((s) => s.clearSerial)
  const [autoscroll, setAutoscroll] = useState(true)
  const box = useRef(null)

  useEffect(() => {
    if (autoscroll && box.current) box.current.scrollTop = box.current.scrollHeight
  }, [serial, autoscroll])

  return (
    <section style={{ height }} className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-ink-700 bg-black/60">
      <header className="flex items-center gap-3 border-b border-ink-700 px-3 py-2 text-[11px]">
        <span className="font-mono uppercase tracking-wider text-slate-400">Serial Monitor</span>
        <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-slate-500">USART2 · 115200</span>
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-slate-500">
          <input
            type="checkbox"
            checked={autoscroll}
            onChange={(e) => setAutoscroll(e.target.checked)}
            className="accent-cyan-400"
          />
          autoscroll
        </label>
        <button onClick={clearSerial} className="text-slate-500 transition hover:text-slate-200">
          clear
        </button>
      </header>
      <div ref={box} className="scroll-thin min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[12px] leading-relaxed">
        {serial.length === 0 ? (
          <p className="text-slate-600">Очікування даних… натисніть «Запустити симуляцію».</p>
        ) : (
          serial.map((l, i) => (
            <div key={i} className={l.text.startsWith('·') ? 'text-slate-500' : l.text.startsWith('!!') ? 'text-red-400' : 'text-led'}>
              {l.text}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
