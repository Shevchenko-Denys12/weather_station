import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instance, Instances, Text } from '@react-three/drei'
import * as THREE from 'three'
import { PartMaterial } from './Interactive'

/**
 * Low-poly building blocks for the board. Units: 1 = 10 mm.
 * All parts are placed with their base at local y = 0.
 */

import { PITCH } from '../../data/layout'
export { PITCH }
const GOLD = '#d4a640'
const TIN = '#c9ccd1'

/** QFP chip: black body + gull-wing pins on four sides. */
export function QFP({ size = 1, height = 0.14, pinsPerSide = 16, pitch = 0.05, label, sublabel, ...props }) {
  const pins = useMemo(() => {
    const out = []
    const half = size / 2 + 0.05
    for (let side = 0; side < 4; side++) {
      const rot = (side * Math.PI) / 2
      for (let i = 0; i < pinsPerSide; i++) {
        const o = (i - (pinsPerSide - 1) / 2) * pitch
        const x = Math.cos(rot) * half - Math.sin(rot) * o
        const z = Math.sin(rot) * half + Math.cos(rot) * o
        out.push({ position: [x, 0.015, z], rotation: [0, -rot, 0] })
      }
    }
    return out
  }, [size, pinsPerSide, pitch])

  return (
    <group {...props}>
      <mesh position={[0, height / 2 + 0.01, 0]} castShadow>
        <boxGeometry args={[size, height, size]} />
        <PartMaterial color="#1b1d22" roughness={0.55} />
      </mesh>
      {/* pin-1 dot */}
      <mesh position={[-size / 2 + 0.12, height + 0.011, -size / 2 + 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 16]} />
        <meshStandardMaterial color="#3a3d44" />
      </mesh>
      <Instances limit={pins.length} castShadow>
        <boxGeometry args={[0.1, 0.03, pitch * 0.5]} />
        <PartMaterial color={TIN} metalness={0.9} roughness={0.3} />
        {pins.map((p, i) => (
          <Instance key={i} {...p} />
        ))}
      </Instances>
      {label && (
        <Text
          position={[0, height + 0.012, sublabel ? -0.06 : 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={size * 0.11}
          color="#9aa0aa"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
      {sublabel && (
        <Text
          position={[0, height + 0.012, 0.1]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={size * 0.075}
          color="#6b7280"
          anchorX="center"
          anchorY="middle"
        >
          {sublabel}
        </Text>
      )}
    </group>
  )
}

/** Male pin header (ST morpho / jumpers): plastic strip + gold pins through the board. */
export function MaleHeader({ rows, cols = 1, below = 0.45, above = 0.6, ...props }) {
  const pins = useMemo(() => {
    const out = []
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        out.push([(c - (cols - 1) / 2) * PITCH, 0, (r - (rows - 1) / 2) * PITCH])
    return out
  }, [rows, cols])

  const len = below + above
  return (
    <group {...props}>
      <mesh position={[0, 0.125, 0]} castShadow receiveShadow>
        <boxGeometry args={[cols * PITCH, 0.25, rows * PITCH]} />
        <PartMaterial color="#141414" roughness={0.8} />
      </mesh>
      <Instances limit={pins.length} castShadow>
        <boxGeometry args={[0.064, len, 0.064]} />
        <PartMaterial color={GOLD} metalness={0.85} roughness={0.25} />
        {pins.map((p, i) => (
          <Instance key={i} position={[p[0], (above - below) / 2, p[2]]} />
        ))}
      </Instances>
    </group>
  )
}

/** Female header (Arduino style): tall black box with square sockets. */
export function FemaleHeader({ count, height = 0.85, ...props }) {
  const holes = useMemo(
    () => Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * PITCH),
    [count],
  )
  return (
    <group {...props}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[PITCH, height, count * PITCH - 0.01]} />
        <PartMaterial color="#17181b" roughness={0.75} />
      </mesh>
      <Instances limit={count}>
        <boxGeometry args={[0.09, 0.005, 0.09]} />
        <meshBasicMaterial color="#000000" />
        {holes.map((z, i) => (
          <Instance key={i} position={[0, height + 0.003, z]} />
        ))}
      </Instances>
    </group>
  )
}

/**
 * Tactile push button. `pressed` sinks the cap; `capColor` distinguishes
 * B1 (blue user) from B2 (black reset).
 */
export function TactButton({ capColor = '#1d4ed8', housingColor = '#b9bdc4', pressed = false, ...props }) {
  const cap = useRef()
  useFrame((_, dt) => {
    if (!cap.current) return
    const target = pressed ? 0.25 : 0.32
    cap.current.position.y = THREE.MathUtils.damp(cap.current.position.y, target, 30, dt)
  })
  return (
    <group {...props}>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.2, 0.6]} />
        <PartMaterial color={housingColor} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh ref={cap} position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.22, 24]} />
        <PartMaterial color={capColor} roughness={0.45} />
      </mesh>
    </group>
  )
}

/**
 * Shared LED animation: lerps lens color/emissive, halo opacity and point
 * light intensity toward the on/off state. Attach the returned refs to a
 * meshStandardMaterial (lens), meshBasicMaterial (halo) and pointLight.
 */
export function useLedGlow({ on, color, offColor, glow, haloOpacity = 0.35 }) {
  const lens = useRef()
  const halo = useRef()
  const light = useRef()
  const onColor = useMemo(() => new THREE.Color(color), [color])
  const off = useMemo(() => new THREE.Color(offColor), [offColor])

  useFrame((_, dt) => {
    const m = lens.current
    if (!m) return
    const k = 1 - Math.exp(-dt * 40) // fast but smooth transition
    m.color.lerp(on ? onColor : off, k)
    m.emissiveIntensity = THREE.MathUtils.lerp(m.emissiveIntensity, on ? glow : 0, k)
    if (halo.current) halo.current.opacity = THREE.MathUtils.lerp(halo.current.opacity, on ? haloOpacity : 0, k)
    if (light.current) light.current.intensity = THREE.MathUtils.lerp(light.current.intensity, on ? glow * 0.8 : 0, k)
  })

  return { lens, halo, light }
}

/**
 * 0805 SMD LED. `on` drives the emissive lens; hover/selection highlights
 * the pads only, so blinking stays visible while the part is inspected.
 */
export function SmdLed({ on = false, color = '#4ade80', offColor = '#5b6560', glow = 2.5, ...props }) {
  const { lens, halo, light } = useLedGlow({ on, color, offColor, glow })

  return (
    <group {...props}>
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0.025, 0]}>
          <boxGeometry args={[0.06, 0.05, 0.16]} />
          <PartMaterial color={TIN} metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.15, 0.12, 0.16]} />
        <meshStandardMaterial
          ref={lens}
          color={offColor}
          emissive={color}
          emissiveIntensity={0}
          roughness={0.2}
          toneMapped={false}
        />
      </mesh>
      {/* soft additive halo so the LED reads as "lit" from any angle */}
      <mesh position={[0, 0.08, 0]} raycast={() => null}>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshBasicMaterial
          ref={halo}
          color={color}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <pointLight ref={light} position={[0, 0.25, 0]} color={color} intensity={0} distance={1.6} decay={2} />
    </group>
  )
}

/** Mini-USB receptacle. */
export function MiniUsb(props) {
  return (
    <group {...props}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.78, 0.4, 0.92]} />
        <PartMaterial color="#c7cbd1" metalness={0.95} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.2, -0.462]}>
        <boxGeometry args={[0.6, 0.22, 0.01]} />
        <meshStandardMaterial color="#0d0d0f" />
      </mesh>
    </group>
  )
}

/** Generic SMD passive (resistor / capacitor). */
export function Passive({ size = [0.16, 0.06, 0.08], color = '#2b2b2b', ...props }) {
  return (
    <group {...props}>
      <mesh position={[0, size[1] / 2, 0]} castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * size[0]) / 2, size[1] / 2, 0]}>
          <boxGeometry args={[0.03, size[1] + 0.005, size[2] + 0.005]} />
          <meshStandardMaterial color={TIN} metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
    </group>
  )
}

/** Silkscreen text lying flat on the PCB. */
export function Silk({ children, size = 0.12, color = '#2b2f36', ...props }) {
  return (
    <Text rotation={[-Math.PI / 2, 0, 0]} fontSize={size} color={color} anchorX="center" anchorY="middle" {...props}>
      {children}
    </Text>
  )
}
