import { useMemo } from 'react'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { PartMaterial } from '../board/Interactive'
import { useLedGlow } from '../board/parts'

/**
 * Through-hole parts for the breadboard. Local origin = breadboard surface,
 * leads run along Z and go into holes at z = ±span/2.
 */

const LEAD = '#b8bcc4'

function Lead({ from, to, radius = 0.018 }) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    return {
      position: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      length: dir.length(),
    }
  }, [from, to])
  return (
    <mesh position={position} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <PartMaterial color={LEAD} metalness={0.9} roughness={0.3} />
    </mesh>
  )
}

/** 5 mm through-hole LED. Anode (long leg) at +Z, cathode at −Z. */
export function ThtLed({ on = false, span, color = '#ff3b30', offColor = '#6e5a5a', glow = 3.5, standoff = 0.35 }) {
  const { lens, halo, light } = useLedGlow({ on, color, offColor, glow, haloOpacity: 0.16 })

  // lathe profile: flange → cylinder → dome
  const shape = useMemo(() => {
    const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.29, 0), new THREE.Vector2(0.29, 0.05), new THREE.Vector2(0.25, 0.05), new THREE.Vector2(0.25, 0.45)]
    for (let i = 1; i <= 10; i++) {
      const a = (i / 10) * (Math.PI / 2)
      pts.push(new THREE.Vector2(0.25 * Math.cos(a), 0.45 + 0.25 * Math.sin(a)))
    }
    return pts
  }, [])

  const h = span / 2
  return (
    <group>
      <Lead from={[0, -0.05, h]} to={[0, standoff, h]} />
      <Lead from={[0, -0.05, -h]} to={[0, standoff, -h]} />
      <mesh position={[0, standoff, 0]} castShadow>
        <latheGeometry args={[shape, 32]} />
        <meshStandardMaterial
          ref={lens}
          color={offColor}
          emissive={color}
          emissiveIntensity={0}
          roughness={0.15}
          transparent
          opacity={0.92}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, standoff + 0.4, 0]} raycast={() => null}>
        <sphereGeometry args={[0.55, 20, 14]} />
        <meshBasicMaterial ref={halo} color={color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, standoff + 0.6, 0]} color={color} intensity={0} distance={3.5} decay={2} />
    </group>
  )
}

/** Resistor color code for 220 Ω ±5 %: red, red, brown, gold. */
const BANDS_220R = ['#d32f2f', '#d32f2f', '#6d3b1f', '#c8a24a']

/** Axial resistor lying flat, leads bent down into holes at z = ±span/2. */
export function AxialResistor({ span, height = 0.18, bands = BANDS_220R }) {
  const h = span / 2
  const bodyLen = 0.34
  return (
    <group>
      <Lead from={[0, -0.05, -h]} to={[0, height, -h]} />
      <Lead from={[0, -0.05, h]} to={[0, height, h]} />
      <Lead from={[0, height, -h]} to={[0, height, h]} />
      <group position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.085, bodyLen - 0.17, 6, 16]} />
          <PartMaterial color="#d9c294" roughness={0.6} />
        </mesh>
        {bands.map((c, i) => (
          <mesh key={i} position={[0, -bodyLen / 2 + 0.07 + i * (i === 3 ? 0.075 : 0.055), 0]}>
            <cylinderGeometry args={[0.089, 0.089, 0.028, 16]} />
            <meshStandardMaterial color={c} roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/**
 * Jumper wire between two world points (socket / hole tops, Dupont ends).
 * `fromDir` / `toDir`: direction the wire leaves each end (default: straight
 * up, so the end dips into the hole). `via`: extra waypoints for routing over
 * tall parts; without it a single arc `lift` above the higher end is used.
 */
export function JumperWire({ from, to, color = '#facc15', lift = 0.7, fromDir = UP, toDir = UP, via, radius = 0.035 }) {
  const geometry = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const da = new THREE.Vector3(...fromDir).normalize()
    const db = new THREE.Vector3(...toDir).normalize()
    const middle = via?.length
      ? via.map((p) => new THREE.Vector3(...p))
      : [a.clone().lerp(b, 0.5).setY(Math.max(a.y, b.y) + lift)]
    const curve = new THREE.CatmullRomCurve3(
      [
        a.clone().addScaledVector(da, -0.25),
        a.clone().addScaledVector(da, 0.3),
        ...middle,
        b.clone().addScaledVector(db, 0.3),
        b.clone().addScaledVector(db, -0.2),
      ],
      false,
      'centripetal',
    )
    return new THREE.TubeGeometry(curve, 96, radius, 10, false)
  }, [from, to, lift, fromDir, toDir, via, radius])

  return (
    <mesh geometry={geometry} castShadow>
      <PartMaterial color={color} roughness={0.45} />
    </mesh>
  )
}

const UP = [0, 1, 0]

/** Resistor colour bands for 4.7 kΩ ±5 %: yellow, violet, red, gold. */
export const BANDS_4K7 = ['#e8c21a', '#7c3aed', '#d32f2f', '#c8a24a']

/**
 * Axial resistor lying flat between two arbitrary hole tops (world or
 * parent-local points at the same height), leads bent down into the holes.
 */
export function ResistorBetween({ from, to, bands, ...props }) {
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]
  const span = Math.hypot(dx, dz)
  return (
    <group position={[(from[0] + to[0]) / 2, from[1], (from[2] + to[2]) / 2]} rotation-y={Math.atan2(dx, dz)} {...props}>
      <AxialResistor span={span} bands={bands} />
    </group>
  )
}

/**
 * Ceramic disc capacitor (Ø5 mm, e.g. 100 nF "104") standing between two
 * holes; legs splay from the holes up into the disc.
 */
export function CeramicDisc({ from, to, label = '104', ...props }) {
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]
  const span = Math.hypot(dx, dz)
  const h = span / 2
  const discY = 0.55
  return (
    <group position={[(from[0] + to[0]) / 2, from[1], (from[2] + to[2]) / 2]} rotation-y={Math.atan2(dx, dz) - Math.PI / 2} {...props}>
      <Lead from={[-h, -0.05, 0]} to={[-0.1, discY - 0.2, 0]} />
      <Lead from={[h, -0.05, 0]} to={[0.1, discY - 0.2, 0]} />
      <mesh position={[0, discY, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.14, 32]} />
        <PartMaterial color="#c8742a" roughness={0.55} />
      </mesh>
      <Text position={[0, discY, 0.072]} fontSize={0.1} color="#3b2410" anchorX="center" anchorY="middle">
        {label}
      </Text>
    </group>
  )
}
