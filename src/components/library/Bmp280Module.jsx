import { MODULES } from '../../data/modules'
import { pinsOf } from '../../data/pinout'
import { Interactive } from '../board/Interactive'
import { PinLabel, silkTint, usePinColors } from '../board/pins'
import { Chip, ModuleFrame, ModuleHeader, ModuleSilk, PcbShape, SILK_WHITE, SOLDER_MASK } from './shared'

/**
 * GY-BMP280-3.3 breakout: 15 × 11.5 mm purple PCB, Bosch BMP280 (LGA 2.0 × 2.5 × 0.95 mm,
 * metal lid with vent hole), pull-ups / decoupling, 6-pin 2.54 mm header pointing down.
 * Plugged into the breadboard (column f, rows 40–45), overhanging the front half.
 * Layout approximated from typical module photos (no official drawing).
 */
const M = MODULES.BMP280
const { w, l, t } = M.pcb
const HOLES = [[-0.48, -0.2, 0.15]]
const PASSIVES = [
  { at: [0.58, -0.38], color: '#1f1f1f' },
  { at: [0.58, -0.22], color: '#1f1f1f' },
  { at: [0.58, -0.06], color: '#1f1f1f' },
  { at: [-0.08, -0.34], color: '#a9865a', rot: Math.PI / 2 },
  { at: [-0.08, -0.12], color: '#a9865a', rot: Math.PI / 2 },
]

export default function Bmp280Module() {
  const colorOf = usePinColors()
  const pins = pinsOf('BMP280')

  return (
    <ModuleFrame module={M}>
      <Interactive id={M.id} labelOffset={[0, 0.6, -0.4]}>
        <PcbShape w={w} l={l} t={t} color={SOLDER_MASK.purple} chamfer={0.03} holes={HOLES} />

        {/* BMP280: metal-lid LGA with the pressure vent */}
        <group position={[0.25, t, -0.22]}>
          <mesh position={[0, 0.0475, 0]} castShadow>
            <boxGeometry args={[0.2, 0.095, 0.25]} />
            <meshStandardMaterial color="#d3d6db" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0.045, 0.096, -0.07]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.014, 16]} />
            <meshBasicMaterial color="#111" />
          </mesh>
        </group>

        {PASSIVES.map(({ at, color, rot = 0 }, i) => (
          <Chip key={i} size={[0.16, 0.05, 0.08]} color={color} position={[at[0], t, at[1]]} rotation-y={rot} />
        ))}

        <ModuleSilk y={t + 0.002} position={[0.08, 0, 0.06]} size={0.06}>
          GY-BMP280-3.3
        </ModuleSilk>
        {pins.map((p) => (
          <PinLabel
            key={p.id}
            pin={p}
            position={[p.local[0], t + 0.002, 0.24]}
            anchorX="center"
            fontSize={0.055}
            color={silkTint(colorOf(p, SILK_WHITE))}
          >
            {p.label}
          </PinLabel>
        ))}
      </Interactive>
      <ModuleHeader group="BMP280" pcbT={t} />
    </ModuleFrame>
  )
}
