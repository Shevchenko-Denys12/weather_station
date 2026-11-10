import { useMemo } from 'react'
import { Instance, Instances, RoundedBox } from '@react-three/drei'
import { MODULES } from '../../data/modules'
import { pinsOf } from '../../data/pinout'
import { Interactive, PartMaterial } from '../board/Interactive'
import { PinLabel, silkTint, usePinColors } from '../board/pins'
import { Chip, ModuleFrame, ModuleHeader, ModuleSilk, PcbShape, SILK_WHITE, SOLDER_MASK } from './shared'

/**
 * DHT11 module, 3 pins "+ − OUT": the Aosong DHT11 (blue 12 × 15.5 × 5.5 mm
 * housing) lying flat on a ≈ 12.7 × 28.5 mm PCB with grille up, plus the
 * on-board 10 kΩ pull-up on OUT, 100 nF decoupling and a power LED.
 * Plugged into the breadboard (f22–f24), sensor overhanging the front half.
 * Pin order as printed on the user's board; component layout approximated.
 */
const M = MODULES.DHT11
const { w, l, t } = M.pcb
const SENSOR = { w: 1.2, h: 0.55, l: 1.55, z: -0.625 } // lying flat at the far end
const GRILLE = { cols: 5, rows: 6, cell: 0.13, gap: 0.065 }

export default function Dht11() {
  const colorOf = usePinColors()
  const pins = useMemo(() => pinsOf('DHT11'), [])
  const top = t + 0.002

  const cells = useMemo(() => {
    const out = []
    const step = GRILLE.cell + GRILLE.gap
    for (let r = 0; r < GRILLE.rows; r++)
      for (let c = 0; c < GRILLE.cols; c++)
        out.push([(c - (GRILLE.cols - 1) / 2) * step, SENSOR.z + (r - (GRILLE.rows - 1) / 2) * step])
    return out
  }, [])

  return (
    <ModuleFrame module={M}>
      <Interactive id={M.id} labelOffset={[0, 1.0, -0.6]}>
        <PcbShape w={w} l={l} t={t} color={SOLDER_MASK.blue} chamfer={0.04} />

        {/* the sensor itself, grille up */}
        <RoundedBox args={[SENSOR.w, SENSOR.h, SENSOR.l]} radius={0.04} smoothness={3} position={[0, t + SENSOR.h / 2, SENSOR.z]} castShadow>
          <PartMaterial color="#3d8fd6" roughness={0.55} />
        </RoundedBox>
        <Instances limit={cells.length}>
          <boxGeometry args={[GRILLE.cell, 0.006, GRILLE.cell]} />
          <meshStandardMaterial color="#14324f" roughness={0.9} />
          {cells.map(([x, z], i) => (
            <Instance key={i} position={[x, t + SENSOR.h + 0.002, z]} />
          ))}
        </Instances>

        {/* pull-up 10 kΩ, 100 nF, power LED + its resistor */}
        <Chip size={[0.2, 0.05, 0.125]} position={[-0.3, t, 0.45]} />
        <Chip size={[0.2, 0.09, 0.125]} color="#a9865a" position={[0.3, t, 0.45]} />
        <Chip size={[0.2, 0.08, 0.125]} color="#f2c4c4" position={[-0.3, t, 0.75]} />
        <Chip size={[0.2, 0.05, 0.125]} position={[0.3, t, 0.75]} />
        <ModuleSilk y={top} position={[0, 0, 0.27]} size={0.07}>DHT11</ModuleSilk>

        {pins.map((p) => (
          <PinLabel key={p.id} pin={p} position={[p.local[0], top, 1.02]} anchorX="center" fontSize={p.label.length > 1 ? 0.06 : 0.09} color={silkTint(colorOf(p, SILK_WHITE))}>
            {p.label === '-' ? '−' : p.label}
          </PinLabel>
        ))}
      </Interactive>
      <ModuleHeader group="DHT11" pcbT={t} />
    </ModuleFrame>
  )
}
