import { useMemo } from 'react'
import { Instance, Instances, Text } from '@react-three/drei'
import { useBoardStore } from '../../store/useBoardStore'
import { BOARD_TOP, MCU_BODY, MCU_CENTER, MCU_PITCH } from '../../data/layout'
import { pinsOf } from '../../data/pinout'
import { Interactive, PartMaterial } from './Interactive'
import { PinLabel, pinEvents, silkTint, usePinColors } from './pins'

/**
 * STM32F411RET6 in LQFP64 (10 × 10 mm, 0.5 mm pitch).
 * Body → part selection ("mcu"); each of the 64 gull-wing leads and its
 * silkscreen label → individual pin selection.
 */
const BODY_H = 0.14
const LEAD_LEN = 0.1

const SIDE = {
  // rotation of the lead box, label placement and orientation per side
  L: { rot: 0, dx: -1, dz: 0, anchor: 'right', textRot: 0 },
  R: { rot: 0, dx: 1, dz: 0, anchor: 'left', textRot: 0 },
  T: { rot: Math.PI / 2, dx: 0, dz: -1, anchor: 'left', textRot: Math.PI / 2 },
  B: { rot: Math.PI / 2, dx: 0, dz: 1, anchor: 'right', textRot: Math.PI / 2 },
}

const LEAD_BASE = '#c9ccd1'
const LABEL_BASE = { gpio: '#1d2433', gnd: '#64748b', power: '#b91c1c', ctrl: '#7c3aed', nc: '#94a3b8' }

export default function McuLqfp64() {
  const pins = useMemo(() => pinsOf('U7'), [])
  const colorOf = usePinColors()
  const showLabels = useBoardStore((s) => s.labels.mcu)
  const [cx, cz] = MCU_CENTER

  return (
    <group>
      <Interactive id="mcu" position={[cx, BOARD_TOP, cz]} labelOffset={[0, 0.7, -0.75]}>
        <mesh position={[0, 0.01 + BODY_H / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[MCU_BODY, BODY_H, MCU_BODY]} />
          <PartMaterial color="#1b1d22" roughness={0.55} />
        </mesh>
        {/* pin-1 dimple (top-left) */}
        <mesh position={[-MCU_BODY / 2 + 0.1, 0.011 + BODY_H, -MCU_BODY / 2 + 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.035, 20]} />
          <meshStandardMaterial color="#0d0e11" />
        </mesh>
        <Marking y={0.012 + BODY_H} />
      </Interactive>

      <Instances limit={pins.length} castShadow>
        <boxGeometry args={[LEAD_LEN, 0.03, MCU_PITCH * 0.5]} />
        <meshStandardMaterial color="#ffffff" metalness={0.85} roughness={0.3} />
        {pins.map((p) => (
          <Instance
            key={p.id}
            position={[p.pos[0], BOARD_TOP + 0.016, p.pos[2]]}
            rotation={[0, SIDE[p.side].rot, 0]}
            color={colorOf(p, LEAD_BASE)}
            {...pinEvents(p.id)}
          />
        ))}
      </Instances>

      {showLabels &&
        pins.map((p) => {
          const s = SIDE[p.side]
          const gap = LEAD_LEN / 2 + 0.03
          return (
            <PinLabel
              key={p.id}
              pin={p}
              position={[p.pos[0] + s.dx * gap, BOARD_TOP + 0.002, p.pos[2] + s.dz * gap]}
              rotation={[-Math.PI / 2, 0, s.textRot]}
              anchorX={s.anchor}
              fontSize={0.03}
              color={silkTint(colorOf(p, LABEL_BASE[p.kind]))}
            >
              {p.label}
            </PinLabel>
          )
        })}

      {/* designator as printed on MB1360C: top-right of the package */}
      <Text {...flat} position={[cx + 0.96, BOARD_TOP + 0.002, cz - 0.37]} fontSize={0.1} color="#1a86d0">U7</Text>
    </group>
  )
}

const flat = { rotation: [-Math.PI / 2, 0, 0], anchorX: 'center', anchorY: 'middle' }

/** Laser marking: ST logo, part number, date code. */
function Marking({ y }) {
  return (
    <group position={[0, y, 0]}>
      <Text {...flat} position={[-0.27, 0, -0.27]} fontSize={0.1} color="#8b9099">
        ST
      </Text>
      <Text {...flat} position={[0.2, 0, -0.27]} fontSize={0.06} color="#6b7079">
        ARM
      </Text>
      <Text {...flat} position={[0, 0, -0.06]} fontSize={0.105} color="#9aa0aa" letterSpacing={0.02}>
        STM32F411
      </Text>
      <Text {...flat} position={[0, 0, 0.08]} fontSize={0.085} color="#8b9099">
        RET6
      </Text>
      <Text {...flat} position={[0, 0, 0.22]} fontSize={0.055} color="#6b7079">
        GH21Z 93 CHN 609
      </Text>
    </group>
  )
}
