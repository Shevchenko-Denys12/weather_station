import { createContext, useContext } from 'react'
import { Html, useCursor } from '@react-three/drei'
import { useBoardStore } from '../../store/useBoardStore'
import { COMPONENTS } from '../../data/components'
import { focusOn, rememberFocus } from '../camera/cameraApi'

/** Where the pointer hit the part (works for parts drawn in world space, like wires). */
const worldPoint = (e) => e.point.toArray()

export const ACCENT = '#22d3ee'

const PartContext = createContext({ hovered: false, selected: false })

/**
 * Wraps any group of meshes and makes it a selectable board part.
 * Hover → highlight + floating label; click → select in global store.
 */
export function Interactive({ id, children, onActivate, labelOffset = [0, 0.55, 0], ...groupProps }) {
  const hovered = useBoardStore((s) => s.hoveredId === id)
  const selected = useBoardStore((s) => s.selectedId === id)
  const setHovered = useBoardStore((s) => s.setHovered)
  const select = useBoardStore((s) => s.select)
  useCursor(hovered)

  return (
    <group
      {...groupProps}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(id)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        if (useBoardStore.getState().hoveredId === id) setHovered(null)
      }}
      onClick={(e) => {
        e.stopPropagation()
        select(id)
        rememberFocus(worldPoint(e))
        onActivate?.(e)
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        focusOn(worldPoint(e), 3)
      }}
    >
      <PartContext.Provider value={{ hovered, selected }}>{children}</PartContext.Provider>

      {hovered && (
        <Html position={labelOffset} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded-md border border-accent/40 bg-ink-900/90 px-2 py-1 font-mono text-[11px] text-accent shadow-lg backdrop-blur">
            {COMPONENTS[id]?.tag ?? id}
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * Standard material that glows with the accent color while its parent
 * <Interactive> is hovered or selected.
 */
export function PartMaterial({ color, emissive = '#000000', emissiveIntensity = 1, ...props }) {
  const { hovered, selected } = useContext(PartContext)
  const glow = selected ? 0.6 : hovered ? 0.35 : 0
  return (
    <meshStandardMaterial
      color={color}
      emissive={glow ? ACCENT : emissive}
      emissiveIntensity={glow || emissiveIntensity}
      {...props}
    />
  )
}

export const usePartState = () => useContext(PartContext)
