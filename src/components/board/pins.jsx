import { useMemo } from 'react'
import { Html, Instance, Instances, Text, useCursor } from '@react-three/drei'
import { useBoardStore } from '../../store/useBoardStore'
import { BOARD_TOP, FEMALE_HEADER_H, PITCH } from '../../data/layout'
import { GROUP_INFO, PIN_BY_ID, pinsOf } from '../../data/pinout'
import { focusOn, rememberFocus } from '../camera/cameraApi'

/**
 * Per-pin interaction shared by morpho pins, Arduino sockets and MCU leads.
 * Hovering or selecting a pin highlights its whole net (e.g. PA5 lights up
 * on U7, CN10 and D13 at once); nets driven HIGH by the simulator glow orange.
 */

export const PIN_COLORS = {
  focus: '#cffafe', // the hovered / selected pin itself
  net: '#22d3ee', // other pins on the same net
  high: '#fb923c', // GPIO currently HIGH
}

/** Returns colorOf(pin, baseColor) reflecting hover / selection / live level. */
export function usePinColors() {
  const hoveredPin = useBoardStore((s) => s.hoveredPin)
  const selectedPin = useBoardStore((s) => s.selectedPin)
  const gpio = useBoardStore((s) => s.gpio)

  return useMemo(() => {
    const focus = new Set([hoveredPin, selectedPin].filter(Boolean))
    const nets = new Set([...focus].map((id) => PIN_BY_ID[id]?.net).filter(Boolean))
    return (pin, base) => {
      if (focus.has(pin.id)) return PIN_COLORS.focus
      if (pin.net && nets.has(pin.net)) return PIN_COLORS.net
      if (pin.kind === 'gpio' && gpio[pin.net] === 1) return PIN_COLORS.high
      return base
    }
  }, [hoveredPin, selectedPin, gpio])
}

/** Pointer handlers that make any mesh / instance act as pin `id`. */
export function pinEvents(id) {
  const { setHoveredPin, selectPin } = useBoardStore.getState()
  const pos = PIN_BY_ID[id].pos
  return {
    onPointerOver: (e) => {
      e.stopPropagation()
      setHoveredPin(id)
    },
    onPointerOut: (e) => {
      e.stopPropagation()
      if (useBoardStore.getState().hoveredPin === id) setHoveredPin(null)
    },
    onClick: (e) => {
      e.stopPropagation()
      selectPin(id)
      rememberFocus(pos)
    },
    onDoubleClick: (e) => {
      e.stopPropagation()
      focusOn(pos, 1.8)
    },
  }
}

/** Flat label that also acts as a hit target for its pin. */
export function PinLabel({ pin, color, children, ...props }) {
  return (
    <Text rotation={[-Math.PI / 2, 0, 0]} anchorY="middle" color={color} {...props} {...pinEvents(pin.id)}>
      {children}
    </Text>
  )
}

// ── ST morpho: 2 × 19 male pins ──────────────────────────────────────
const PIN_ABOVE = 0.6
const PIN_BELOW = 0.45

export function MorphoHeader({ group }) {
  const pins = useMemo(() => pinsOf(group), [group])
  const colorOf = usePinColors()
  const showLabels = useBoardStore((s) => s.labels.morpho)
  const labelY = BOARD_TOP + PIN_ABOVE + 0.04

  return (
    <group>
      {/* plastic base, one cell per pin so every cell is clickable */}
      <Instances limit={pins.length} castShadow receiveShadow>
        <boxGeometry args={[PITCH, 0.25, PITCH]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
        {pins.map((p) => (
          <Instance
            key={p.id}
            position={[p.pos[0], BOARD_TOP + 0.125, p.pos[2]]}
            color={darkTint(colorOf(p, '#161616'))}
            {...pinEvents(p.id)}
          />
        ))}
      </Instances>

      <Instances limit={pins.length} castShadow>
        <boxGeometry args={[0.064, PIN_ABOVE + PIN_BELOW, 0.064]} />
        <meshStandardMaterial color="#ffffff" metalness={0.85} roughness={0.25} />
        {pins.map((p) => (
          <Instance
            key={p.id}
            position={[p.pos[0], BOARD_TOP + (PIN_ABOVE - PIN_BELOW) / 2, p.pos[2]]}
            scale={p.kind === 'nc' ? [1, 0.55, 1] : 1}
            color={colorOf(p, '#d4a640')}
            {...pinEvents(p.id)}
          />
        ))}
      </Instances>

      {showLabels &&
        pins.map((p) => (
          <PinLabel
            key={p.id}
            pin={p}
            position={[p.pos[0] + (p.odd ? -0.15 : 0.15), labelY, p.pos[2]]}
            anchorX={p.odd ? 'right' : 'left'}
            fontSize={0.062}
            color={colorOf(p, p.kind === 'gpio' ? '#e2e8f0' : p.kind === 'nc' ? '#64748b' : '#fca5a5')}
            outlineWidth={0.012}
            outlineColor="#0b1220"
          >
            {p.label}
          </PinLabel>
        ))}
    </group>
  )
}

// ── Arduino Uno V3: female sockets ───────────────────────────────────
export function ArduinoHeader({ group }) {
  const pins = useMemo(() => pinsOf(group), [group])
  const colorOf = usePinColors()
  const showLabels = useBoardStore((s) => s.labels.arduino)
  const right = pins[0].pos[0] > 0 // CN5/CN9 labels go to the left of the header
  const H = FEMALE_HEADER_H

  return (
    <group>
      <Instances limit={pins.length} castShadow receiveShadow>
        <boxGeometry args={[PITCH, H, PITCH - 0.006]} />
        <meshStandardMaterial color="#ffffff" roughness={0.75} />
        {pins.map((p) => (
          <Instance
            key={p.id}
            position={[p.pos[0], BOARD_TOP + H / 2, p.pos[2]]}
            color={darkTint(colorOf(p, '#17181b'))}
            {...pinEvents(p.id)}
          />
        ))}
      </Instances>
      <Instances limit={pins.length}>
        <boxGeometry args={[0.09, 0.005, 0.09]} />
        <meshBasicMaterial color="#ffffff" />
        {pins.map((p) => (
          <Instance key={p.id} position={[p.pos[0], BOARD_TOP + H + 0.003, p.pos[2]]} color={colorOf(p, '#000000')} />
        ))}
      </Instances>

      {showLabels &&
        pins
          .filter((p) => p.silk)
          .map((p) => (
            <PinLabel
              key={p.id}
              pin={p}
              position={[p.pos[0] + (right ? -0.2 : 0.2), BOARD_TOP + 0.002, p.pos[2]]}
              anchorX={right ? 'right' : 'left'}
              fontSize={0.075}
              color={silkTint(colorOf(p, '#1a86d0'))}
            >
              {p.silk}
            </PinLabel>
          ))}
    </group>
  )
}

/** Highlight colors re-mapped for dark plastic (header bodies). */
export function darkTint(c) {
  if (c === PIN_COLORS.focus) return '#38bdf8'
  if (c === PIN_COLORS.net) return '#0e7490'
  if (c === PIN_COLORS.high) return '#c2410c'
  return c
}

/** Highlight colors re-mapped for silkscreen on the white PCB. */
export function silkTint(c) {
  if (c === PIN_COLORS.focus || c === PIN_COLORS.net) return '#0891b2'
  if (c === PIN_COLORS.high) return '#ea580c'
  return c
}

// ── floating tooltip for the hovered pin ─────────────────────────────
export function PinTooltip() {
  const id = useBoardStore((s) => s.hoveredPin)
  const level = useBoardStore((s) => (id ? s.gpio[PIN_BY_ID[id]?.net] : undefined))
  useCursor(Boolean(id))
  const pin = id && PIN_BY_ID[id]
  if (!pin) return null

  const where = pin.group === 'U7' ? `U7 · pin ${pin.n}` : `${pin.group} · ${pin.n}`
  const alias = [...new Set([pin.arduino, pin.signal])].filter((v) => v && v !== pin.label).join(' · ')

  return (
    <Html position={[pin.pos[0], pin.pos[1] + 0.45, pin.pos[2]]} center zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div className="whitespace-nowrap rounded-md border border-accent/40 bg-ink-900/95 px-2 py-1 font-mono text-[11px] shadow-lg">
        <span className="text-slate-400">{where}</span>
        <span className="mx-1.5 text-slate-600">│</span>
        <span className="font-medium text-accent">{pin.label}</span>
        {alias && <span className="ml-1.5 text-slate-300">{alias}</span>}
        {level !== undefined && pin.kind === 'gpio' && (
          <span className={`ml-1.5 ${level ? 'text-orange-400' : 'text-slate-500'}`}>{level ? 'HIGH' : 'LOW'}</span>
        )}
      </div>
    </Html>
  )
}

export const groupName = (group) => GROUP_INFO[group]?.name ?? group
