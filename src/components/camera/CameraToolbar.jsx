import { useState } from 'react'
import { useBoardStore } from '../../store/useBoardStore'
import { flyTo, focusLast, VIEWS } from './cameraApi'

/** Floating camera presets + "focus selection" for the 3D viewport. */
export default function CameraToolbar() {
  const active = useBoardStore((s) => s.cameraView)
  const hasSelection = useBoardStore((s) => Boolean(s.selectedId || s.selectedPin))
  const [help, setHelp] = useState(false)

  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2">
      {help && (
        <div className="rounded-lg border border-ink-700 bg-ink-900/90 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-400 backdrop-blur">
          <Row k="ЛКМ" v="обертання" />
          <Row k="ПКМ / Shift+ЛКМ" v="переміщення" />
          <Row k="колесо" v="зум до курсора" />
          <Row k="подвійний клік" v="фокус на деталі / піні" />
          <Row k="W A S D / ←↑↓→" v="рух (Shift — швидше)" />
          <Row k="Q E" v="поворот" />
          <Row k="+ −" v="зум" />
          <Row k="1…9" v="ракурси" />
          <Row k="F · R" v="фокус · скинути" />
        </div>
      )}

      <div className="flex max-w-full flex-wrap items-center justify-end gap-1 rounded-lg border border-ink-700 bg-ink-900/85 p-1 backdrop-blur">
        {Object.entries(VIEWS).map(([id, v]) => (
          <button
            key={id}
            onClick={() => flyTo(id)}
            title={`${v.label} (${v.key})`}
            aria-pressed={active === id}
            className={`rounded px-2 py-1 text-[11px] transition ${
              active === id ? 'bg-accent/15 text-accent' : 'text-slate-400 hover:bg-ink-800 hover:text-slate-200'
            }`}
          >
            {v.label}
          </button>
        ))}
        <span className="mx-0.5 h-4 w-px bg-ink-700" />
        <button
          onClick={focusLast}
          disabled={!hasSelection}
          title="Фокус на вибраному (F)"
          className="rounded px-2 py-1 text-[11px] text-slate-400 transition enabled:hover:bg-ink-800 enabled:hover:text-slate-200 disabled:opacity-40"
        >
          ◎ Фокус
        </button>
        <button
          onClick={() => setHelp((h) => !h)}
          aria-pressed={help}
          title="Керування камерою"
          className={`rounded px-2 py-1 text-[11px] transition ${help ? 'text-accent' : 'text-slate-400 hover:text-slate-200'}`}
        >
          ?
        </button>
      </div>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-300">{k}</span>
      <span>{v}</span>
    </div>
  )
}
