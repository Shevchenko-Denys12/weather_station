import { useBoardStore } from '../store/useBoardStore'
import { COMPONENTS } from '../data/components'
import { ALT_FUNCTIONS, BOARD_NOTES, GROUP_INFO, NET_MEMBERS, PIN_BY_ID } from '../data/pinout'

/** Bottom-left card: details of the selected part or pin. */
export default function InfoPanel() {
  const selectedId = useBoardStore((s) => s.selectedId)
  const selectedPin = useBoardStore((s) => s.selectedPin)

  if (selectedPin && PIN_BY_ID[selectedPin]) return <PinCard pin={PIN_BY_ID[selectedPin]} />
  if (selectedId && COMPONENTS[selectedId]) return <PartCard part={COMPONENTS[selectedId]} />

  return (
    <div className="pointer-events-auto max-w-xs rounded-lg border border-ink-700 bg-ink-900/80 px-4 py-3 text-xs text-slate-400 backdrop-blur">
      Наведіть курсор на компонент або будь-який пін, клікніть, щоб побачити деталі.
      <span className="mt-1 block text-slate-500">Подвійний клік: наблизити камеру. Усі клавіші під кнопкою «?» справа.</span>
    </div>
  )
}

function Card({ tag, title, onClose, children }) {
  return (
    <div className="pointer-events-auto max-h-[60vh] w-80 overflow-y-auto rounded-lg border border-accent/30 bg-ink-900/90 p-4 shadow-xl backdrop-blur scroll-thin">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-accent">{tag}</p>
          <h3 className="mt-0.5 text-base font-semibold text-slate-100">{title}</h3>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200" aria-label="Закрити">
          ✕
        </button>
      </div>
      {children}
    </div>
  )
}

function Specs({ rows }) {
  if (!rows.length) return null
  return (
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-ink-700 pt-3 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-slate-500">{k}</dt>
          <dd className="font-mono text-slate-200">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function PartCard({ part }) {
  const clearSelection = useBoardStore((s) => s.clearSelection)
  return (
    <Card tag={part.tag} title={part.name} onClose={clearSelection}>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{part.description}</p>
      <Specs rows={part.specs} />
    </Card>
  )
}

function PinCard({ pin }) {
  const clearSelection = useBoardStore((s) => s.clearSelection)
  const selectPin = useBoardStore((s) => s.selectPin)
  const setHoveredPin = useBoardStore((s) => s.setHoveredPin)
  const level = useBoardStore((s) => (pin.kind === 'gpio' ? s.gpio[pin.net] : undefined))

  const where =
    pin.group === 'U7' ? `U7 · вивід ${pin.n}` : `${pin.group}${pin.header ? ` ${pin.header}` : ''} · пін ${pin.n}`
  const title = pin.group === 'U7' || pin.label === pin.signal ? pin.signal : `${pin.label} · ${pin.signal}`
  const isModule = GROUP_INFO[pin.group].kind === 'module'
  const note = isModule ? pin.note : (BOARD_NOTES[pin.net] ?? BOARD_NOTES[pin.signal])
  const af = ALT_FUNCTIONS[pin.signal]
  // other places this net appears (skip the long GND list)
  const others = pin.net && pin.net !== 'GND' ? NET_MEMBERS[pin.net].filter((id) => id !== pin.id) : []

  const rows = [
    [isModule ? 'Модуль' : 'Роз’єм', GROUP_INFO[pin.group].name],
    isModule && ['Мережа', !pin.net || pin.net.includes(':') ? 'не підключено' : pin.net],
    ['Тип', pin.kindLabel],
    pin.mcuPin && pin.group !== 'U7' && ['Вивід МК', `U7 · ${pin.mcuPin}`],
    pin.arduino && pin.group === 'U7' && ['Arduino', pin.arduino],
    pin.arduino && pin.group !== 'U7' && GROUP_INFO[pin.group].kind === 'morpho' && ['Arduino', pin.arduino],
    level !== undefined && ['Рівень', level ? 'HIGH (3.3 V)' : 'LOW (0 V)'],
  ].filter(Boolean)

  return (
    <Card tag={where} title={title} onClose={clearSelection}>
      {note && <p className="mt-2 text-sm leading-relaxed text-slate-300">{note}</p>}
      <Specs rows={rows} />

      {af && (
        <div className="mt-3 border-t border-ink-700 pt-3">
          <p className="mb-1.5 text-xs text-slate-500">Альтернативні функції</p>
          <div className="flex flex-wrap gap-1">
            {af.map((f) => (
              <span key={f} className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] text-slate-300">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-3 border-t border-ink-700 pt-3">
          <p className="mb-1.5 text-xs text-slate-500">Той самий сигнал на</p>
          <div className="flex flex-wrap gap-1">
            {others.map((id) => {
              const p = PIN_BY_ID[id]
              return (
                <button
                  key={id}
                  onClick={() => selectPin(id)}
                  onMouseEnter={() => setHoveredPin(id)}
                  onMouseLeave={() => setHoveredPin(null)}
                  className="rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent ring-1 ring-accent/30 transition hover:bg-accent/20"
                >
                  {p.group === 'U7' ? `U7·${p.n}` : `${p.group}·${p.n}`}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
