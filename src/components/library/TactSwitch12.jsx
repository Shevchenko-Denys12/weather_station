import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import { MODULES } from '../../data/modules'
import { pinsOf } from '../../data/pinout'
import { Interactive, PartMaterial } from '../board/Interactive'
import { pinEvents, usePinColors } from '../board/pins'
import { pressSw1 } from '../../simulator/runtime'
import { ModuleFrame } from './shared'

/**
 * 12 × 12 mm tactile switch with a round cap (breadboard kit style).
 * Body 12 × 12 × 3.5 mm + steel cover, Ø11.5 cap, 4 legs on a 12.5 × 5.0 mm grid.
 * Legs 1–2 and 3–4 are always connected; pressing joins the two pairs.
 * Straddles the breadboard channel (d/g, rows 28 & 30); pin 1 → D2 (PA10), pin 4 → GND.
 * Clicking the cap plays the press and pulses PA10 low, so the firmware switches the OLED screen.
 */
const M = MODULES.SW1
const LEG_DOWN = 0.35
const TRAVEL = 0.03

export default function TactSwitch12({ capColor = '#dc2626' }) {
  const [pressed, setPressed] = useState(false)
  const timer = useRef()
  const moving = useRef()
  const colorOf = usePinColors()
  const legs = useMemo(() => pinsOf('SW1'), [])

  useEffect(() => () => clearTimeout(timer.current), [])
  useFrame((_, dt) => {
    if (moving.current) moving.current.position.y = THREE.MathUtils.damp(moving.current.position.y, pressed ? -TRAVEL : 0, 30, dt)
  })

  const press = () => {
    pressSw1()
    setPressed(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setPressed(false), 160)
  }

  return (
    <ModuleFrame module={M}>
      <Interactive id={M.id} labelOffset={[0, 1.15, 0]} onActivate={press}>
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.3, 1.2]} />
          <PartMaterial color="#1c1d21" roughness={0.7} />
        </mesh>
        {/* steel cover plate with its corner tabs */}
        <mesh position={[0, 0.315, 0]} castShadow>
          <boxGeometry args={[1.2, 0.03, 1.2]} />
          <PartMaterial color="#cfd3d8" metalness={0.9} roughness={0.3} />
        </mesh>
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[sx * 0.61, 0.2, sz * 0.45]}>
              <boxGeometry args={[0.02, 0.24, 0.18]} />
              <meshStandardMaterial color="#cfd3d8" metalness={0.9} roughness={0.3} />
            </mesh>
          )),
        )}

        <group ref={moving}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.26, 20]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          <mesh position={[0, 0.6, 0]} castShadow>
            <cylinderGeometry args={[0.575, 0.575, 0.36, 40]} />
            <PartMaterial color={capColor} roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.78, 0]} scale={[1, 0.18, 1]} castShadow>
            <sphereGeometry args={[0.575, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <PartMaterial color={capColor} roughness={0.45} />
          </mesh>
        </group>
      </Interactive>

      {/* legs: one interactive pin each */}
      <Instances limit={legs.length} castShadow>
        <boxGeometry args={[0.07, LEG_DOWN + 0.12, 0.05]} />
        <meshStandardMaterial color="#ffffff" metalness={0.85} roughness={0.3} />
        {legs.map((p) => (
          <Instance key={p.id} position={[p.local[0], p.local[1] - LEG_DOWN / 2 + 0.06, p.local[2]]} color={colorOf(p, '#c9ccd1')} {...pinEvents(p.id)} />
        ))}
      </Instances>
    </ModuleFrame>
  )
}
