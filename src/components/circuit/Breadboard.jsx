import { useMemo } from 'react'
import { Instance, Instances, RoundedBox, Text } from '@react-three/drei'
import { PITCH } from '../../data/layout'
import { BB_HEIGHT, BB_L, BB_ROWS, BB_W, COL_X, holeLocal, RAIL_HOLES, railRow, RAILS, rowZ } from '../../data/breadboard'
import { PartMaterial } from '../board/Interactive'

/**
 * Full-size solderless breadboard (830 tie points). Geometry and hole helpers
 * live in data/breadboard.js; this file only draws it (local origin = centre
 * of the bottom face).
 */
export { BB_HEIGHT, BB_ROWS, holeLocal } from '../../data/breadboard'

const RAIL_LIST = Object.values(RAILS)

export default function Breadboard() {
  const holes = useMemo(() => {
    const out = []
    for (let r = 1; r <= BB_ROWS; r++) for (const c of Object.keys(COL_X)) out.push(holeLocal(r, c))
    // power rails: 5 holes, gap, 5 holes… (25 per rail)
    for (const { x } of RAIL_LIST)
      for (let k = 0; k < RAIL_HOLES; k++) if (k % 6 !== 5) out.push([x * PITCH, BB_HEIGHT, rowZ(railRow(k))])
    return out
  }, [])

  return (
    <group>
      <RoundedBox args={[BB_W, BB_HEIGHT, BB_L]} radius={0.05} smoothness={3} position={[0, BB_HEIGHT / 2, 0]} castShadow receiveShadow>
        <PartMaterial color="#f4f4ef" roughness={0.7} />
      </RoundedBox>

      {/* center channel */}
      <mesh position={[0, BB_HEIGHT + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.6 * PITCH, BB_L - 0.1]} />
        <meshStandardMaterial color="#d6d6d0" />
      </mesh>

      {/* rail stripes */}
      {RAIL_LIST.map(({ x, color }) => (
        <mesh key={x} position={[(x + Math.sign(x) * 0.7) * PITCH, BB_HEIGHT + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.025, BB_L - 0.4]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}

      <Instances limit={holes.length}>
        <boxGeometry args={[0.085, 0.006, 0.085]} />
        <meshBasicMaterial color="#26272b" />
        {holes.map((p, i) => (
          <Instance key={i} position={[p[0], p[1] + 0.002, p[2]]} />
        ))}
      </Instances>

      {/* column letters at both ends, row numbers every 5 */}
      {Object.entries(COL_X).flatMap(([c, x]) =>
        [-1, 1].map((end) => (
          <Label key={c + end} position={[x * PITCH, BB_HEIGHT + 0.003, end * (BB_L / 2 - 0.12)]}>
            {c}
          </Label>
        )),
      )}
      {[1, ...Array.from({ length: Math.floor(BB_ROWS / 5) }, (_, i) => (i + 1) * 5)].map((r) => (
        <Label key={r} position={[-6.6 * PITCH,BB_HEIGHT + 0.003, rowZ(r)]}>
          {r}
        </Label>
      ))}
    </group>
  )
}

function Label({ children, ...props }) {
  return (
    <Text rotation={[-Math.PI / 2, 0, 0]} fontSize={0.1} color="#7a7f88" anchorX="center" anchorY="middle" {...props}>
      {children}
    </Text>
  )
}
