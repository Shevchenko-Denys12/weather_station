import { useEffect, useRef } from 'react'
import { CameraControls, CameraControlsImpl } from '@react-three/drei'
import { useBoardStore } from '../../store/useBoardStore'
import { flyTo, focusLast, nudge, registerControls, VIEWS } from './cameraApi'

/**
 * CameraControls (smooth orbit / pan / dolly-to-cursor) + keyboard navigation.
 *
 *   Mouse: left = rotate, right / Shift+left = pan, wheel = zoom toward cursor
 *   Keys:  W A S D / arrows = move, Q E = rotate, + − = zoom,
 *          1…9 = presets, F = focus selection, R = overview
 */
export default function CameraRig() {
  const ref = useRef(null)
  const setCameraView = useBoardStore((s) => s.setCameraView)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    registerControls(c)
    flyTo('overview', false)
    // any manual interaction leaves the named preset
    const leave = () => setCameraView(null)
    c.addEventListener('controlstart', leave)
    // Shift + left drag pans instead of rotating (for trackpads / one-button mice)
    const { ACTION } = CameraControlsImpl
    const syncShift = (e) => {
      c.mouseButtons.left = e.shiftKey ? ACTION.TRUCK : ACTION.ROTATE
    }
    window.addEventListener('keydown', syncShift)
    window.addEventListener('keyup', syncShift)
    return () => {
      c.removeEventListener('controlstart', leave)
      window.removeEventListener('keydown', syncShift)
      window.removeEventListener('keyup', syncShift)
      registerControls(null)
    }
  }, [setCameraView])

  useEffect(() => {
    const presetByKey = Object.fromEntries(Object.entries(VIEWS).map(([id, v]) => [v.key, id]))
    const STEP = 0.6

    const onKey = (e) => {
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      const fast = e.shiftKey ? 2.5 : 1

      const actions = {
        w: () => nudge.truck(0, STEP * fast),
        arrowup: () => nudge.truck(0, STEP * fast),
        s: () => nudge.truck(0, -STEP * fast),
        arrowdown: () => nudge.truck(0, -STEP * fast),
        a: () => nudge.truck(-STEP * fast, 0),
        arrowleft: () => nudge.truck(-STEP * fast, 0),
        d: () => nudge.truck(STEP * fast, 0),
        arrowright: () => nudge.truck(STEP * fast, 0),
        q: () => nudge.rotate(0.2),
        e: () => nudge.rotate(-0.2),
        '+': () => nudge.dolly(1.2 * fast),
        '=': () => nudge.dolly(1.2 * fast),
        '-': () => nudge.dolly(-1.2 * fast),
        f: focusLast,
        r: () => flyTo('overview'),
      }
      const run = actions[k] ?? (presetByKey[k] && (() => flyTo(presetByKey[k])))
      if (!run) return
      e.preventDefault()
      run()
      if (!presetByKey[k] && k !== 'r') setCameraView(null)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setCameraView])

  return (
    <CameraControls
      ref={ref}
      makeDefault
      minDistance={1.2}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.1}
      smoothTime={0.28}
      dollyToCursor
    />
  )
}
