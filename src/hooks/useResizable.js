import { useCallback, useEffect, useRef, useState } from 'react'

const read = (key, fallback) => {
  try {
    const v = Number(localStorage.getItem(key))
    return Number.isFinite(v) && v > 0 ? v : fallback
  } catch {
    return fallback
  }
}
const write = (key, v) => {
  try {
    localStorage.setItem(key, String(Math.round(v)))
  } catch {
    /* private mode etc. — size just won't persist */
  }
}

/**
 * Drag-to-resize for a panel that grows toward −axis (sidebar on the right
 * grows leftwards, bottom pane grows upwards).
 *
 * Returns [size, handleProps]. Spread handleProps on the splitter element:
 * pointer drag, arrow keys (±16 px, Shift ±64), double-click = reset.
 * `min` / `max` may be functions so limits follow the window size.
 */
export function useResizable({ storageKey, initial, min, max, axis = 'x' }) {
  const lim = useCallback(
    (v) => {
      const lo = typeof min === 'function' ? min() : min
      const hi = typeof max === 'function' ? max() : max
      return Math.min(Math.max(v, lo), Math.max(lo, hi))
    },
    [min, max],
  )

  const [size, setSize] = useState(() => lim(read(storageKey, initial)))
  const drag = useRef(null)

  const commit = useCallback(
    (v) => {
      const next = lim(v)
      setSize(next)
      write(storageKey, next)
    },
    [lim, storageKey],
  )

  // keep within limits when the window shrinks
  useEffect(() => {
    const onResize = () => setSize((s) => lim(s))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [lim])

  const coord = (e) => (axis === 'x' ? e.clientX : e.clientY)

  const handleProps = {
    role: 'separator',
    tabIndex: 0,
    'aria-orientation': axis === 'x' ? 'vertical' : 'horizontal',
    'aria-valuenow': Math.round(size),
    onPointerDown: (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      drag.current = { start: coord(e), size }
      document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
      document.body.style.userSelect = 'none'
    },
    onPointerMove: (e) => {
      if (!drag.current) return
      setSize(lim(drag.current.size + (drag.current.start - coord(e))))
    },
    onPointerUp: (e) => {
      if (!drag.current) return
      drag.current = null
      e.currentTarget.releasePointerCapture(e.pointerId)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setSize((s) => {
        write(storageKey, s)
        return s
      })
    },
    onDoubleClick: () => commit(initial),
    onKeyDown: (e) => {
      const step = e.shiftKey ? 64 : 16
      const grow = axis === 'x' ? 'ArrowLeft' : 'ArrowUp'
      const shrink = axis === 'x' ? 'ArrowRight' : 'ArrowDown'
      if (e.key === grow) commit(size + step)
      else if (e.key === shrink) commit(size - step)
      else return
      e.preventDefault()
    },
  }

  return [size, handleProps]
}
