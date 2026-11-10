import { useMemo } from 'react'
import { Instance, Instances, Text } from '@react-three/drei'
import * as THREE from 'three'
import { PITCH } from '../../data/layout'
import { pinsOf } from '../../data/pinout'
import { PartMaterial } from '../board/Interactive'
import { darkTint, pinEvents, usePinColors } from '../board/pins'

/**
 * Building blocks for breakout modules. Module components are drawn in
 * module-local space (origin = centre of the PCB underside, y up).
 */

export const SOLDER_MASK = {
  blue: '#1d4f9c',
  purple: '#5b2a86',
  black: '#1a1c22',
}
export const SILK_WHITE = '#eef2f7'
const GOLD = '#d4a640'
const TIN = '#c9ccd1'

/**
 * Board outline extruded from a 2D shape: chamfered corners and real
 * through-holes. `holes`: [[x, z, r], …] in local units.
 */
export function PcbShape({ w, l, t, color, chamfer = 0, radius = 0, holes = [], ...props }) {
  const geometry = useMemo(() => {
    const hw = w / 2
    const hl = l / 2
    const c = chamfer
    const s = new THREE.Shape()
    // shape lives in XY; after rotating −90° about X, shape Y maps to world −Z
    if (radius > 0) {
      const r = radius
      s.moveTo(-hw + r, -hl)
      s.lineTo(hw - r, -hl)
      s.quadraticCurveTo(hw, -hl, hw, -hl + r)
      s.lineTo(hw, hl - r)
      s.quadraticCurveTo(hw, hl, hw - r, hl)
      s.lineTo(-hw + r, hl)
      s.quadraticCurveTo(-hw, hl, -hw, hl - r)
      s.lineTo(-hw, -hl + r)
      s.quadraticCurveTo(-hw, -hl, -hw + r, -hl)
    } else {
      s.moveTo(-hw + c, -hl)
      s.lineTo(hw - c, -hl)
      s.lineTo(hw, -hl + c)
      s.lineTo(hw, hl - c)
      s.lineTo(hw - c, hl)
      s.lineTo(-hw + c, hl)
      s.lineTo(-hw, hl - c)
      s.lineTo(-hw, -hl + c)
      s.closePath()
    }
    for (const [x, z, r] of holes) {
      const h = new THREE.Path()
      h.absarc(x, -z, r, 0, Math.PI * 2, true)
      s.holes.push(h)
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 20 })
    g.rotateX(-Math.PI / 2)
    return g
  }, [w, l, t, chamfer, radius, holes])

  return (
    <mesh geometry={geometry} castShadow receiveShadow {...props}>
      <PartMaterial color={color} roughness={0.5} />
    </mesh>
  )
}

/** Tinned annular ring around a hole (plated pad seen from the top). */
export function PadRing({ r = 0.12, ring = 0.05, y, ...props }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position-y={y} {...props}>
      <ringGeometry args={[r, r + ring, 24]} />
      <meshStandardMaterial color={TIN} metalness={0.85} roughness={0.35} />
    </mesh>
  )
}

/** Flat silkscreen text on a module PCB. */
export function ModuleSilk({ children, y, size = 0.065, color = SILK_WHITE, ...props }) {
  return (
    <Text rotation={[-Math.PI / 2, 0, 0]} position-y={y} fontSize={size} color={color} anchorX="center" anchorY="middle" {...props}>
      {children}
    </Text>
  )
}

/**
 * Straight 2.54 mm header soldered under a breakout (pins point down into the
 * breadboard). Every pin is interactive. Render it inside the module's
 * rotated group: pin.local is the PCB top above the pin in module space.
 */
export function ModuleHeader({ group, pcbT, spacer = 0.25, below = 0.6, above = 0.07 }) {
  const pins = useMemo(() => pinsOf(group), [group])
  const colorOf = usePinColors()
  const len = above + pcbT + spacer + below

  return (
    <group>
      <Instances limit={pins.length} castShadow>
        <boxGeometry args={[PITCH, spacer, PITCH]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
        {pins.map((p) => (
          <Instance
            key={p.id}
            position={[p.local[0], p.local[1] - pcbT - spacer / 2, p.local[2]]}
            color={darkTint(colorOf(p, '#161616'))}
            {...pinEvents(p.id)}
          />
        ))}
      </Instances>
      <Instances limit={pins.length} castShadow>
        <boxGeometry args={[0.064, len, 0.064]} />
        <meshStandardMaterial color="#ffffff" metalness={0.85} roughness={0.25} />
        {pins.map((p) => (
          <Instance key={p.id} position={[p.local[0], p.local[1] + above - len / 2, p.local[2]]} color={colorOf(p, GOLD)} {...pinEvents(p.id)} />
        ))}
      </Instances>
      {/* solder fillets on top of the PCB */}
      <Instances limit={pins.length}>
        <coneGeometry args={[0.07, 0.05, 12]} />
        <meshStandardMaterial color={TIN} metalness={0.9} roughness={0.25} />
        {pins.map((p) => (
          <Instance key={p.id} position={[p.local[0], p.local[1] + 0.025, p.local[2]]} />
        ))}
      </Instances>
    </group>
  )
}


/**
 * SOIC / SOP package: body along X, gull-wing leads on the ±Z sides.
 * Sizes in local units (SOIC-8: bodyL 0.49, bodyW 0.39, span 0.6, h 0.15).
 */
export function Soic({ leadsPerSide, bodyL, bodyW, span, h, pitch = 0.127, label, sublabel, ...props }) {
  const leads = useMemo(() => {
    const out = []
    const leadLen = (span - bodyW) / 2
    for (const side of [-1, 1])
      for (let i = 0; i < leadsPerSide; i++)
        out.push([(i - (leadsPerSide - 1) / 2) * pitch, side * (bodyW / 2 + leadLen / 2), leadLen])
    return out
  }, [leadsPerSide, bodyW, span, pitch])

  return (
    <group {...props}>
      <mesh position={[0, 0.01 + h / 2, 0]} castShadow>
        <boxGeometry args={[bodyL, h, bodyW]} />
        <PartMaterial color="#1b1d22" roughness={0.55} />
      </mesh>
      {/* pin-1 notch on the −X end + dot */}
      <mesh position={[-bodyL / 2, 0.011 + h, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[bodyW * 0.12, 16, -Math.PI / 2, Math.PI]} />
        <meshBasicMaterial color="#0c0d10" />
      </mesh>
      {leads.map(([x, z, len], i) => (
        <mesh key={i} position={[x, 0.02, z]}>
          <boxGeometry args={[pitch * 0.42, 0.02, len]} />
          <meshStandardMaterial color={TIN} metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      {label && (
        <Text rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012 + h, sublabel ? -bodyW * 0.12 : 0]} fontSize={bodyW * 0.17} color="#9aa0aa" anchorX="center" anchorY="middle">
          {label}
        </Text>
      )}
      {sublabel && (
        <Text rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012 + h, bodyW * 0.16]} fontSize={bodyW * 0.12} color="#7a808a" anchorX="center" anchorY="middle">
          {sublabel}
        </Text>
      )}
    </group>
  )
}

/** Plain SMD chip (resistor / capacitor / array) with metallised ends. */
export function Chip({ size, color = '#1f1f1f', ends = 0.025, ...props }) {
  const [l, h, w] = size
  return (
    <group {...props}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[l - 2 * ends, h, w]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (l / 2 - ends / 2), h / 2, 0]}>
          <boxGeometry args={[ends, h + 0.004, w + 0.004]} />
          <meshStandardMaterial color={TIN} metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * TO-92 body (LM35, transistors, regulators): half-round epoxy with a flat,
 * marked face toward +Z. Defaults per TI "LP" package: Ø ≈ 4.8 mm, depth
 * 3.7 mm (flat 1.3 mm from centre), height 4.8 mm. Local y = 0 is the body
 * underside; leads are drawn by the caller (they are interactive pins).
 */
export function To92({ radius = 0.24, flat = 0.13, height = 0.48, lines = [], ...props }) {
  const geometry = useMemo(() => {
    const a = Math.asin(flat / radius)
    const s = new THREE.Shape()
    // shape Y maps to world −Z after the rotation below, so the chord at
    // y = −flat ends up as the front (+Z) face
    s.absarc(0, 0, radius, -a, Math.PI + a, false)
    s.closePath()
    const bevel = 0.012
    const g = new THREE.ExtrudeGeometry(s, {
      depth: height - 2 * bevel,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 32,
    })
    g.rotateX(-Math.PI / 2)
    g.translate(0, bevel, 0)
    return g
  }, [radius, flat, height])

  return (
    <group {...props}>
      <mesh geometry={geometry} castShadow>
        <PartMaterial color="#1a1b1f" roughness={0.6} />
      </mesh>
      {lines.map((line, i) => (
        <Text
          key={line}
          position={[0, height * 0.68 - i * 0.085, flat + 0.014]}
          fontSize={0.072}
          color="#8b9099"
          anchorX="center"
          anchorY="middle"
        >
          {line}
        </Text>
      ))}
    </group>
  )
}

/**
 * Group that places a module at its origin with its rotation. Everything
 * inside is in module-local coordinates (the same space as pin.local).
 */
export function ModuleFrame({ module, children }) {
  return (
    <group position={module.origin} rotation-y={module.rotY ?? 0}>
      {children}
    </group>
  )
}
