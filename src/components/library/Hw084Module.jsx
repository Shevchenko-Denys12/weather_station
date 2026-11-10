import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { GROUND_Y } from '../../data/layout'
import { MODULES } from '../../data/modules'
import { pinsOf } from '../../data/pinout'
import { Interactive, PartMaterial } from '../board/Interactive'
import { darkTint, PinLabel, pinEvents, silkTint, usePinColors } from '../board/pins'
import { Chip, ModuleFrame, ModuleSilk, PadRing, PcbShape, SILK_WHITE, SOLDER_MASK, Soic } from './shared'

/**
 * HW-084 real-time clock: DS3231SN (SOIC-16W) + AT24C32 EEPROM (SOIC-8) on a
 * 38 × 22 mm blue board with chamfered corners; right-angle 6-pin header J1
 * (32K, SQW, SCL, SDA, VCC, GND), 4-hole I²C pass-through J2, CR2032 holder
 * underneath. Layout traced from the Wikimedia Commons photo "HW-084 front.jpg".
 * Stands on three brass standoffs (level with the Nucleo), J1 toward the breadboard; female Dupont housings sit on the
 * used J1 pins (32K stays free).
 */
const M = MODULES.HW084
const { w, l, t } = M.pcb
const { pinY: PIN_Y, pinOut: PIN_OUT, housing: HOUSING } = M.j1
const DUPONT_FREE = ['32K'] // J1 pins left unconnected

const J2 = M.pins.filter((p) => p.header === 'J2')
const HOLES = [
  [-1.07, -0.89, 0.12],
  [1.48, -0.95, 0.12],
  [-1.02, 0.89, 0.12],
  ...J2.map((p) => [p.at[0], p.at[2], 0.05]),
]

export default function Hw084Module() {
  const colorOf = usePinColors()
  const pins = useMemo(() => pinsOf('HW084'), [])
  const j1 = pins.filter((p) => p.header === 'J1')
  const j2 = pins.filter((p) => p.header === 'J2')
  const top = t + 0.002
  const dupont = j1.filter((p) => !DUPONT_FREE.includes(p.label))

  return (
    <ModuleFrame module={M}>
      <Interactive id={M.id} labelOffset={[0.3, 0.75, -0.6]}>
        <PcbShape w={w} l={l} t={t} color={SOLDER_MASK.blue} chamfer={0.1} holes={HOLES} />
        {HOLES.slice(0, 3).map(([x, z, r]) => (
          <PadRing key={`${x}${z}`} position={[x, 0, z]} y={top} r={r} ring={0.03} />
        ))}

        <Soic position={[0.29, t, -0.42]} leadsPerSide={8} bodyL={1.03} bodyW={0.75} span={1.03} h={0.235} label="DS3231SN" sublabel="2024A4 · 917AD" />
        <Soic position={[0.06, t, 0.64]} leadsPerSide={4} bodyL={0.49} bodyW={0.39} span={0.6} h={0.15} label="AT24C32" />

        {/* left column: power LED, R, C, C, two 4× resistor arrays */}
        <Chip size={[0.2, 0.08, 0.125]} color="#efe3dc" position={[-0.64, t, -0.74]} />
        <Chip size={[0.2, 0.05, 0.125]} position={[-0.59, t, -0.49]} />
        <Chip size={[0.2, 0.09, 0.125]} color="#a9865a" position={[-0.59, t, -0.24]} />
        <Chip size={[0.2, 0.09, 0.125]} color="#a9865a" position={[-0.59, t, 0.0]} />
        <Chip size={[0.32, 0.05, 0.16]} position={[-0.59, t, 0.32]} rotation-y={Math.PI / 2} ends={0.02} />
        <Chip size={[0.32, 0.05, 0.16]} position={[-0.59, t, 0.73]} rotation-y={Math.PI / 2} ends={0.02} />
        <Chip size={[0.16, 0.05, 0.08]} position={[1.32, t, -0.68]} />

        {/* 1N4148 MiniMELF (battery charge path): red glass, black cathode band */}
        <group position={[0.94, t + 0.075, -0.53]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.07, 0.07, 0.26, 16]} />
            <meshPhysicalMaterial color="#c0392b" roughness={0.15} transmission={0.3} thickness={0.1} />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.072, 0.072, 0.04, 16]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0, s * 0.155, 0]}>
              <cylinderGeometry args={[0.075, 0.075, 0.05, 16]} />
              <meshStandardMaterial color="#c9ccd1" metalness={0.9} roughness={0.3} />
            </mesh>
          ))}
        </group>

        {/* battery solder points and A0–A2 address jumper pads */}
        <mesh position={[0.98, top, -0.03]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.07, 20]} />
          <meshStandardMaterial color="#c9ccd1" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[-1.02, top, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, 0.15]} />
          <meshStandardMaterial color="#c9ccd1" metalness={0.9} roughness={0.3} />
        </mesh>
        {[0.98, 1.18, 1.38].flatMap((x) =>
          [0.64, 0.8].map((z) => (
            <mesh key={`${x}${z}`} position={[x, top, z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.08, 0.08]} />
              <meshStandardMaterial color="#c9ccd1" metalness={0.9} roughness={0.3} />
            </mesh>
          )),
        )}

        <ModuleSilk y={top} position={[-1.83, 0, 0.98]} size={0.1} anchorX="left">HW-084</ModuleSilk>
        <ModuleSilk y={top} position={[-0.57, 0, -0.95]} size={0.085}>POWER</ModuleSilk>
        {['A0', 'A1', 'A2'].map((a, i) => (
          <ModuleSilk key={a} y={top} position={[0.98 + i * 0.2, 0, 0.96]} size={0.065}>{a}</ModuleSilk>
        ))}
        {j1.map((p) => (
          <PinLabel key={p.id} pin={p} position={[-1.58, top, p.local[2]]} anchorX="left" fontSize={0.1} color={silkTint(colorOf(p, SILK_WHITE))}>
            {p.label}
          </PinLabel>
        ))}
        {j2.map((p) => (
          <PinLabel key={p.id} pin={p} position={[1.58, top, p.local[2]]} anchorX="right" fontSize={0.1} color={silkTint(colorOf(p, SILK_WHITE))}>
            {p.label}
          </PinLabel>
        ))}

        {/* CR2032 holder on the underside */}
        <group position={[0.2, 0, 0]}>
          <mesh position={[0, -0.38, 0]} castShadow>
            <cylinderGeometry args={[1.05, 1.05, 0.08, 48]} />
            <meshStandardMaterial color="#17181b" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.18, 0]} castShadow>
            <cylinderGeometry args={[1.0, 1.0, 0.32, 48]} />
            <meshStandardMaterial color="#cfd3d8" metalness={0.9} roughness={0.25} />
          </mesh>
          <mesh position={[0.62, -0.015, 0]}>
            <boxGeometry args={[0.7, 0.03, 0.5]} />
            <meshStandardMaterial color="#b8bcc2" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
      </Interactive>

      {/* J1: right-angle header — plastic block, horizontal + vertical pin legs */}
      <mesh position={[-1.8, t + 0.125, 0.06]} castShadow>
        <boxGeometry args={[0.25, 0.25, 6 * 0.254]} />
        <meshStandardMaterial color="#161616" roughness={0.8} />
      </mesh>
      <Instances limit={j1.length} castShadow>
        <boxGeometry args={[PIN_OUT + 0.25, 0.064, 0.064]} />
        <meshStandardMaterial color="#ffffff" metalness={0.85} roughness={0.25} />
        {j1.map((p) => (
          <Instance key={p.id} position={[-1.8 - PIN_OUT / 2 + 0.06, PIN_Y, p.local[2]]} color={colorOf(p, '#d4a640')} {...pinEvents(p.id)} />
        ))}
      </Instances>
      <Instances limit={j1.length}>
        <boxGeometry args={[0.064, PIN_Y + 0.05, 0.064]} />
        <meshStandardMaterial color="#ffffff" metalness={0.85} roughness={0.25} />
        {j1.map((p) => (
          <Instance key={p.id} position={[-1.72, (PIN_Y - 0.05) / 2, p.local[2]]} color={colorOf(p, '#d4a640')} />
        ))}
      </Instances>

      {/* female Dupont housings on the wired J1 pins */}
      <Instances limit={dupont.length} castShadow>
        <boxGeometry args={[HOUSING[0] - HOUSING[1], 0.25, 0.245]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
        {dupont.map((p) => (
          <Instance key={p.id} position={[(HOUSING[0] + HOUSING[1]) / 2, PIN_Y, p.local[2]]} color={darkTint(colorOf(p, '#141414'))} {...pinEvents(p.id)} />
        ))}
      </Instances>

      {/* J2: plated holes, each one interactive */}
      <Instances limit={j2.length}>
        <cylinderGeometry args={[0.095, 0.095, 0.012, 24]} />
        <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.35} />
        {j2.map((p) => (
          <Instance key={p.id} position={[p.local[0], p.local[1] + 0.003, p.local[2]]} color={darkTint(colorOf(p, '#c9ccd1'))} {...pinEvents(p.id)} />
        ))}
      </Instances>
      <Instances limit={j2.length}>
        <cylinderGeometry args={[0.05, 0.05, 0.014, 20]} />
        <meshBasicMaterial color="#05060a" />
        {j2.map((p) => (
          <Instance key={p.id} position={[p.local[0], p.local[1] + 0.004, p.local[2]]} />
        ))}
      </Instances>
      {/* brass standoffs in the three mounting holes, down to the table */}
      {HOLES.slice(0, 3).map(([x, z]) => (
        <mesh key={`so${x}${z}`} position={[x, (GROUND_Y - M.origin[1]) / 2, z]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, M.origin[1] - GROUND_Y, 6]} />
          <meshStandardMaterial color="#c8a24a" metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
    </ModuleFrame>
  )
}
