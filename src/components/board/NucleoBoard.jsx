import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useBoardStore } from '../../store/useBoardStore'
import { pressUserButton, resetMcu } from '../../simulator/runtime'
import {
  BOARD_BOTTOM,
  BOARD_T,
  BOARD_TOP,
  GROUND_Y,
  HEADER_X,
  MOUNT_HOLE_R,
  NUCLEO_HOLES,
  PITCH,
  rowZ,
  STANDOFF_H,
  STLINK_SPLIT_Z,
} from '../../data/layout'
import { Interactive, PartMaterial } from './Interactive'
import { MaleHeader, Passive, QFP, Silk, SmdLed } from './parts'
import { ArduinoHeader, MorphoHeader, PinTooltip } from './pins'
import McuLqfp64 from './McuLqfp64'

/**
 * NUCLEO-F411RE, board MB1360C, laid out from the top-view photo
 * nucleo_f411re.webp (see data/layout.js for the pixel → unit mapping).
 * 1 unit = 10 mm, −Z = ST-LINK / micro-USB end, +Z = bottom edge.
 * The board stands on three brass standoffs in its Ø3.2 mm holes.
 */
const TOP = BOARD_TOP
const SILK = TOP + 0.002
const BLUE = '#1a86d0' // MB1360C silkscreen is blue
const ST_BLUE = '#3cb4e6'
const VERTICAL = [-Math.PI / 2, 0, Math.PI / 2]
const HALF_PI = Math.PI / 2

export default function NucleoBoard(props) {
  const ld2 = useBoardStore((s) => s.gpio.PA5 === 1)
  const b1Pressed = useBoardStore((s) => s.gpio.PC13 === 0)
  const running = useBoardStore((s) => s.status === 'running')

  return (
    <group {...props}>
      <Pcb />
      <Standoffs />

      {/* ═════════════ ST-LINK/V2-1 section ═════════════ */}
      <Interactive id="usb" position={[1.23, TOP, -3.97]} labelOffset={[0, 0.5, 0]}>
        <MicroUsb />
      </Interactive>
      <Silk position={[1.62, SILK, -4.03]} size={0.09} color={BLUE} anchorX="left">USB_STLINK</Silk>
      <Silk position={[1.66, SILK, -3.9]} size={0.09} color={BLUE} anchorX="left">CN2</Silk>

      <Interactive id="stlink" position={[0.0, TOP, -2.66]} labelOffset={[0, 0.5, 0]}>
        <QFP size={0.7} pinsPerSide={12} label="STM32F103" sublabel="CBT6" />
      </Interactive>
      <Silk position={[-0.57, SILK, -3.1]} size={0.1} color={BLUE}>U2</Silk>

      <Interactive id="x1" position={[-0.79, TOP, -2.64]} labelOffset={[0, 0.45, 0]}>
        <mesh position={[0, 0.045, 0]} castShadow>
          <boxGeometry args={[0.3, 0.09, 0.36]} />
          <PartMaterial color="#6d6158" roughness={0.45} metalness={0.3} />
        </mesh>
      </Interactive>
      <Silk position={[-0.81, SILK, -2.87]} size={0.09} color={BLUE}>X1</Silk>

      <Interactive id="ld1" position={[2.54, TOP, -3.71]} labelOffset={[0, 0.4, 0]}>
        <SmdLed on={running} color="#4ade80" offColor="#e8e6e0" />
      </Interactive>
      <Silk position={[2.62, SILK, -4.0]} size={0.09} color={BLUE}>LD1</Silk>
      <Silk position={[2.81, SILK, -3.71]} size={0.08} color={BLUE} rotation={VERTICAL}>COM</Silk>

      <Interactive id="ld2" position={[3.12, TOP, -2.82]} labelOffset={[0, 0.4, 0]}>
        <SmdLed on={ld2} color="#4ade80" glow={4} offColor="#e8e6e0" />
      </Interactive>
      <Silk position={[3.12, SILK, -3.06]} size={0.08} color={BLUE} rotation={VERTICAL}>LD2</Silk>

      {/* jumpers and small headers */}
      <MaleHeader rows={2} position={[-3.2, TOP, -3.64]} below={0.05} above={0.5} />
      <Jumper position={[-3.2, TOP, -3.64]} />
      <Silk position={[-3.2, SILK, -4.02]} size={0.1} color={BLUE}>JP4</Silk>
      <Silk position={[-2.93, SILK, -3.64]} size={0.08} color={BLUE} rotation={VERTICAL}>GND</Silk>

      <MaleHeader rows={2} position={[3.24, TOP, -3.64]} below={0.05} above={0.5} />
      <Jumper position={[3.24, TOP, -3.64]} />
      <Silk position={[3.24, SILK, -4.02]} size={0.1} color={BLUE}>JP5</Silk>
      <Silk position={[2.97, SILK, -3.64]} size={0.08} color={BLUE} rotation={VERTICAL}>GND</Silk>

      <Interactive id="cn4" position={[-1.3, TOP, -3.52]} labelOffset={[0, 1.0, 0]}>
        <MaleHeader rows={4} below={0.05} above={0.5} />
        <Jumper position={[0, 0, -PITCH]} />
        <Jumper position={[0, 0, PITCH]} />
      </Interactive>
      <Silk position={[-1.3, SILK, -3.02]} size={0.1} color={BLUE}>CN4</Silk>
      <Silk position={[-1.67, SILK, -3.47]} size={0.09} color={BLUE} rotation={VERTICAL}>ST-LINK</Silk>
      <Silk position={[-0.87, SILK, -3.62]} size={0.09} color={BLUE} rotation={VERTICAL}>NUCLEO</Silk>
      <SilkRect x1={-1.55} x2={-1.49} z1={-3.98} z2={-3.0} />
      <SilkRect x1={-1.06} x2={-1.0} z1={-3.95} z2={-3.05} />

      <MaleHeader rows={1} cols={2} position={[-0.03, TOP, -3.89]} below={0.05} above={0.5} />
      <Jumper position={[-0.03, TOP, -3.89]} rotation={[0, HALF_PI, 0]} />
      <Silk position={[0.3, SILK, -3.95]} size={0.09} color={BLUE} anchorX="left">JP1</Silk>
      <Silk position={[0.3, SILK, -3.8]} size={0.06} color={BLUE} anchorX="left">STLK_RST</Silk>

      <Interactive id="swd" position={[-2.71, TOP, -2.6]} labelOffset={[0, 0.9, 0]}>
        <MaleHeader rows={6} below={0.05} above={0.5} />
      </Interactive>
      <Silk position={[-2.99, SILK, -2.83]} size={0.09} color={BLUE} rotation={VERTICAL}>SWD</Silk>
      <Silk position={[-3.2, SILK, -1.89]} size={0.09} color={BLUE}>CN11</Silk>

      <MaleHeader rows={2} position={[-2.18, TOP, -2.11]} below={0.05} above={0.5} />
      <Silk position={[-1.95, SILK, -2.24]} size={0.08} color={BLUE} anchorX="left">TX</Silk>
      <Silk position={[-1.95, SILK, -1.98]} size={0.08} color={BLUE} anchorX="left">RX</Silk>
      <Silk position={[-2.36, SILK, -2.1]} size={0.08} color={BLUE} rotation={VERTICAL}>JP6</Silk>

      <NucleoLogo position={[-3.18, SILK, -2.53]} />
      <EsdMark position={[-1.4, SILK, -2.06]} />

      <SmallIc position={[1.25, TOP, -3.32]} size={[0.3, 0.2]} leads={4} rotation={[0, HALF_PI, 0]} />
      <Silk position={[1.25, SILK, -3.03]} size={0.09} color={BLUE}>U1</Silk>
      <SmallIc position={[0.51, TOP, -3.33]} size={[0.16, 0.24]} leads={1} rotation={[0, HALF_PI, 0]} />
      <SmallIc position={[2.11, TOP, -3.71]} size={[0.24, 0.16]} leads={1} />
      <Silk position={[1.98, SILK, -3.45]} size={0.09} color={BLUE}>T1</Silk>
      <SmallIc position={[1.74, TOP, -2.48]} size={[0.3, 0.17]} leads={3} />
      <Silk position={[1.8, SILK, -2.68]} size={0.09} color={BLUE}>U3</Silk>
      <SmallIc position={[2.97, TOP, -2.35]} size={[0.3, 0.17]} leads={3} rotation={[0, HALF_PI, 0]} />
      <Silk position={[2.97, SILK, -2.67]} size={0.09} color={BLUE}>U4</Silk>

      <PassiveList items={STLINK_PASSIVES} />

      {/* ═════════════ target section ═════════════ */}
      <Interactive id="b1" position={[-0.81, TOP, -1.2]} onActivate={() => pressUserButton()}>
        <SmdTact capColor="#2f7fe0" pressed={b1Pressed} />
      </Interactive>
      <Silk position={[-0.81, SILK, -0.73]} size={0.1} color={BLUE}>B1</Silk>
      <Silk position={[-0.1, SILK, -1.18]} size={0.1} color={BLUE} rotation={VERTICAL}>USER</Silk>

      <Interactive id="b2" position={[0.84, TOP, -1.19]} onActivate={() => resetMcu()}>
        <SmdTact capColor="#141518" />
      </Interactive>
      <Silk position={[0.37, SILK, -0.73]} size={0.1} color={BLUE}>B2</Silk>
      <Silk position={[0.13, SILK, -1.18]} size={0.1} color={BLUE} rotation={VERTICAL}>RESET</Silk>

      <Interactive id="ld3" position={[1.74, TOP, -1.34]} labelOffset={[0, 0.4, 0]}>
        <SmdLed on color="#f87171" glow={1.4} offColor="#e8e6e0" />
      </Interactive>
      <Interactive id="ld4" position={[2.08, TOP, -1.34]} labelOffset={[0, 0.4, 0]}>
        <SmdLed on={false} color="#f87171" offColor="#e8e6e0" />
      </Interactive>
      <Silk position={[1.6, SILK, -1.22]} size={0.08} color={BLUE} rotation={VERTICAL}>R27 LD3</Silk>
      <Silk position={[1.94, SILK, -1.22]} size={0.08} color={BLUE} rotation={VERTICAL}>R28 LD4</Silk>

      {/* U5: LD1117S50 (marking "LD50") in SOT-223, VIN → 5 V */}
      <Interactive id="u5" position={[-1.32, TOP, -0.21]} labelOffset={[0, 0.55, 0]}>
        <Sot223 marking="LD50" />
      </Interactive>
      <Silk position={[-1.32, SILK, 0.31]} size={0.1} color={BLUE}>U5</Silk>
      <Silk position={[-1.86, SILK, -0.17]} size={0.09} color={BLUE}>C17</Silk>
      <Silk position={[-2.45, SILK, -0.62]} size={0.09} color={BLUE}>R30</Silk>
      <Silk position={[-2.63, SILK, -0.38]} size={0.09} color={BLUE}>E5V</Silk>
      <Silk position={[-2.63, SILK, -0.17]} size={0.09} color={BLUE}>GND</Silk>
      <Silk position={[-0.64, SILK, 0.22]} size={0.09} color={BLUE}>C18</Silk>

      {/* JP3 IDD: MCU current measurement */}
      <Interactive id="jp3" position={[-0.07, TOP, -0.12]} labelOffset={[0, 0.9, 0]}>
        <MaleHeader rows={1} cols={2} below={0.05} above={0.5} />
        <Jumper position={[0, 0, 0]} rotation={[0, HALF_PI, 0]} />
      </Interactive>
      <Silk position={[-0.07, SILK, -0.34]} size={0.1} color={BLUE}>JP3</Silk>
      <Silk position={[-0.07, SILK, 0.14]} size={0.1} color={BLUE}>IDD</Silk>

      {/* JP2: 5 V source select (CHG / E5V / VIN / STLK), jumper on STLK */}
      <Interactive id="jp2" position={[1.175, TOP, -0.29]} labelOffset={[0, 1.0, 0]}>
        <MaleHeader rows={2} cols={4} below={0.05} above={0.5} />
        <Jumper position={[1.5 * PITCH, 0, 0]} />
      </Interactive>
      <Silk position={[0.5, SILK, -0.29]} size={0.1} color={BLUE}>JP2</Silk>
      {['CHG', 'E5V', 'VIN', 'STLK'].map((t, i) => (
        <Silk key={t} position={[1.175 + (i - 1.5) * PITCH, SILK, -0.75]} size={0.08} color={BLUE} rotation={VERTICAL}>
          {t}
        </Silk>
      ))}

      <Interactive id="u6" position={[0.99, TOP, 0.18]} labelOffset={[0, 0.4, 0]}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <boxGeometry args={[0.3, 0.08, 0.3]} />
          <PartMaterial color="#1b1c20" roughness={0.6} />
        </mesh>
      </Interactive>
      <Silk position={[0.96, SILK, 0.41]} size={0.09} color={BLUE}>U6</Silk>

      {/* U7: the STM32F411RET6, all 64 leads interactive */}
      <McuLqfp64 />
      <McuCornerMarks />

      {/* X2 (HSE footprint) and X3 (32.768 kHz LSE) */}
      <mesh position={[-1.3, TOP + 0.035, 1.47]} castShadow>
        <boxGeometry args={[0.19, 0.07, 0.3]} />
        <meshStandardMaterial color="#cfd3d8" metalness={0.95} roughness={0.2} />
      </mesh>
      <Silk position={[-1.3, SILK, 1.21]} size={0.09} color={BLUE}>X2</Silk>
      <Interactive id="crystal" position={[-1.35, TOP, 2.0]} labelOffset={[0, 0.4, 0]}>
        <Passive size={[0.34, 0.09, 0.16]} color="#2a2b2f" rotation={[0, HALF_PI, 0]} />
      </Interactive>
      <Silk position={[-1.35, SILK, 1.77]} size={0.09} color={BLUE}>X3</Silk>
      {[[-1.62, 1.22, 'C23'], [-0.99, 1.1, 'R31'], [-0.99, 1.23, 'R32'], [-0.99, 2.03, 'R33'], [-0.99, 2.17, 'R34'], [-1.7, 1.78, 'C25'], [-1.7, 2.23, 'C26']].map(
        ([x, z, t]) => (
          <Silk key={t} position={[x, SILK, z]} size={0.075} color={BLUE}>
            {t}
          </Silk>
        ),
      )}
      {[1.73, 1.89].map((z) => (
        <EmptyPads key={z} position={[-0.97, SILK, z]} />
      ))}

      <PassiveList items={TARGET_PASSIVES} />
      {['SB2', 'SB4', 'SB3', 'SB5'].map((t, i) => (
        <Silk key={t} position={[-1.6, SILK, 3.15 + i * 0.15]} size={0.08} color={BLUE} anchorX="left">
          {t}
        </Silk>
      ))}

      {/* ═════════════ headers (every pin is interactive) ═════════════ */}
      {['CN6', 'CN8', 'CN5', 'CN9'].map((g) => (
        <ArduinoHeader key={g} group={g} />
      ))}
      <MorphoHeader group="CN7" />
      <MorphoHeader group="CN10" />
      <Silk position={[-1.89, SILK, rowZ(9)]} size={0.09} color={BLUE} rotation={VERTICAL}>POWER</Silk>
      <Silk position={[-1.94, SILK, rowZ(16.5)]} size={0.09} color={BLUE} rotation={VERTICAL}>AIN</Silk>
      <Silk position={[HEADER_X.CN6, SILK, rowZ(13.0)]} size={0.09} color={BLUE}>CN6</Silk>
      {[
        ['CN7', HEADER_X.CN7],
        ['CN8', HEADER_X.CN8],
        ['CN9', HEADER_X.CN9],
        ['CN10', HEADER_X.CN10],
      ].map(([t, x]) => (
        <Silk key={t} position={[x, SILK, rowZ(19) + 0.24]} size={0.1} color={BLUE}>
          {t}
        </Silk>
      ))}
      {[
        [HEADER_X.CN7 - PITCH / 2, '1'],
        [HEADER_X.CN7 + PITCH / 2, '2'],
        [HEADER_X.CN10 - PITCH / 2, '1'],
        [HEADER_X.CN10 + PITCH / 2, '2'],
      ].map(([x, t], i) => (
        <Silk key={i} position={[x, SILK, rowZ(1) - 0.22]} size={0.08} color={BLUE}>
          {t}
        </Silk>
      ))}

      <PinTooltip />

      {/* ═════════════ branding ═════════════ */}
      <Silk position={[-1.46, SILK, 0.57]} size={0.12} color={BLUE}>MB1360C</Silk>
      <Silk position={[-0.52, SILK, 0.75]} size={0.17} color={BLUE}>www.st.com/stm32nucleo</Silk>
      <Silk position={[1.36, SILK, 1.72]} size={0.85} color={ST_BLUE} letterSpacing={-0.08}>ST</Silk>
      <Silk position={[-1.58, SILK, 2.68]} size={0.26} color={BLUE}>CE</Silk>
      <SilkRect x1={-1.065} x2={1.453} z1={2.52} z2={3.42} outline />
    </group>
  )
}

// ── board outline ────────────────────────────────────────────────────
// [x, z] polygon traced from the photo (clockwise seen from above)
const OUTLINE = [
  [-3.38, -4.125], [3.38, -4.125], [3.5, -4.005], [3.5, 3.84], [3.41, 3.944], [1.47, 3.944],
  [1.255, 4.13], [-2.155, 4.13], [-2.37, 3.917], [-3.41, 3.917], [-3.5, 3.83], [-3.5, -4.005],
]
// snap-off slots between ST-LINK and target: [x1, x2] at STLINK_SPLIT_Z
const SLOTS = [[-3.36, -1.89], [-1.65, 0.34], [0.74, 1.58], [1.87, 3.36]]
const SLOT_H = 0.1

/** White PCB extruded from the traced outline, with the real holes and slots cut out. */
function Pcb() {
  const geometry = useMemo(() => {
    const s = new THREE.Shape()
    OUTLINE.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z)))
    s.closePath()
    for (const [x, z] of NUCLEO_HOLES) {
      const h = new THREE.Path()
      h.absarc(x, -z, MOUNT_HOLE_R, 0, Math.PI * 2, true)
      s.holes.push(h)
    }
    const r = SLOT_H / 2
    const y = -STLINK_SPLIT_Z
    for (const [x1, x2] of SLOTS) {
      const h = new THREE.Path()
      h.moveTo(x1 + r, y - r)
      h.lineTo(x2 - r, y - r)
      h.absarc(x2 - r, y, r, -HALF_PI, HALF_PI, false)
      h.lineTo(x1 + r, y + r)
      h.absarc(x1 + r, y, r, HALF_PI, Math.PI * 1.5, false)
      s.holes.push(h)
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: BOARD_T, bevelEnabled: false, curveSegments: 24 })
    g.rotateX(-HALF_PI)
    g.translate(0, BOARD_BOTTOM, 0)
    return g
  }, [])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#f4f6f4" roughness={0.55} />
    </mesh>
  )
}

/** M3 brass hex standoffs from the table up to the PCB, with a screw head on top. */
function Standoffs() {
  return NUCLEO_HOLES.map(([x, z]) => (
    <group key={`${x}${z}`} position={[x, 0, z]}>
      <mesh position={[0, GROUND_Y + STANDOFF_H / 2, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, STANDOFF_H, 6]} />
        <meshStandardMaterial color="#c8a24a" metalness={0.85} roughness={0.35} />
      </mesh>
      <mesh position={[0, TOP + 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.27, 0.27, 0.08, 24]} />
        <meshStandardMaterial color="#c9ccd1" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, TOP + 0.081, 0]} rotation={[-HALF_PI, 0, Math.PI / 4]}>
        <planeGeometry args={[0.3, 0.04]} />
        <meshBasicMaterial color="#55585e" />
      </mesh>
    </group>
  ))
}

function Jumper({ position, rotation }) {
  return (
    <mesh position={[position[0], position[1] + 0.47, position[2]]} rotation={rotation} castShadow>
      <boxGeometry args={[0.22, 0.42, 0.48]} />
      <meshStandardMaterial color="#121212" roughness={0.7} />
    </mesh>
  )
}

/** Micro-USB B receptacle (7.5 × 5 × 2.5 mm), opening toward −Z over the board edge. */
function MicroUsb() {
  return (
    <group>
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.28, 0.56]} />
        <PartMaterial color="#c7cbd1" metalness={0.95} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.14, -0.281]}>
        <boxGeometry args={[0.62, 0.16, 0.004]} />
        <meshStandardMaterial color="#141416" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.45, 0.02, 0.05]}>
          <boxGeometry args={[0.12, 0.03, 0.2]} />
          <meshStandardMaterial color="#c7cbd1" metalness={0.95} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

/** 6 × 6 mm SMD tact switch: black body, round cap, four gull-wing legs. */
function SmdTact({ capColor, pressed = false }) {
  const cap = useRef()
  useFrame((_, dt) => {
    if (cap.current) cap.current.position.y = THREE.MathUtils.damp(cap.current.position.y, pressed ? 0.2 : 0.25, 30, dt)
  })
  return (
    <group>
      <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.18, 0.6]} />
        <PartMaterial color="#1c1d21" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.181, 0]} rotation={[-HALF_PI, 0, 0]}>
        <ringGeometry args={[0.22, 0.27, 32]} />
        <meshStandardMaterial color="#3a3c42" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh ref={cap} position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.14, 32]} />
        <PartMaterial color={capColor} roughness={0.45} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.4, 0.015, sz * 0.21]}>
            <boxGeometry args={[0.24, 0.03, 0.1]} />
            <meshStandardMaterial color="#c9ccd1" metalness={0.9} roughness={0.3} />
          </mesh>
        )),
      )}
    </group>
  )
}

/** SOT-223 regulator: body, wide tab toward −Z, three legs toward +Z. */
function Sot223({ marking }) {
  return (
    <group>
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.65, 0.16, 0.35]} />
        <PartMaterial color="#1c1d21" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.015, -0.27]} castShadow>
        <boxGeometry args={[0.34, 0.03, 0.22]} />
        <PartMaterial color="#c9ccd1" metalness={0.9} roughness={0.3} />
      </mesh>
      {[-0.23, 0, 0.23].map((x) => (
        <mesh key={x} position={[x, 0.015, 0.25]}>
          <boxGeometry args={[0.07, 0.03, 0.16]} />
          <meshStandardMaterial color="#c9ccd1" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <Silk position={[0, 0.162, -0.04]} size={0.09} color="#9aa0aa">{marking}</Silk>
    </group>
  )
}

/** Small SOIC/SOT-style IC: body + `leads` gull-wing leads on two sides. */
function SmallIc({ size: [w, d], leads, ...props }) {
  const pitch = d / leads
  return (
    <group {...props}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[w * 0.75, 0.08, d]} />
        <meshStandardMaterial color="#1b1c20" roughness={0.6} />
      </mesh>
      {[-1, 1].flatMap((side) =>
        Array.from({ length: leads }, (_, i) => (
          <mesh key={`${side}${i}`} position={[side * w * 0.42, 0.015, (i - (leads - 1) / 2) * pitch]}>
            <boxGeometry args={[w * 0.18, 0.02, pitch * 0.45]} />
            <meshStandardMaterial color="#c9ccd1" metalness={0.9} roughness={0.3} />
          </mesh>
        )),
      )}
    </group>
  )
}

/** The white 45° corner marks around U7. */
function McuCornerMarks() {
  return [
    [-0.6, 1.1, -1],
    [0.58, 1.1, 1],
    [-0.6, 2.28, 1],
    [0.58, 2.28, -1],
  ].map(([x, z, s]) => (
    <mesh key={`${x}${z}`} position={[x, SILK, z]} rotation={[-HALF_PI, 0, (s * Math.PI) / 4]}>
      <planeGeometry args={[0.16, 0.05]} />
      <meshStandardMaterial color="#d6d9dc" roughness={0.4} />
    </mesh>
  ))
}

/** Unpopulated 0603 footprint: two tinned pads. */
function EmptyPads(props) {
  return (
    <group {...props}>
      {[-0.06, 0.06].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[-HALF_PI, 0, 0]}>
          <planeGeometry args={[0.06, 0.08]} />
          <meshStandardMaterial color="#d8dbde" metalness={0.8} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

/** Blue silkscreen bar (filled) or rectangle outline. */
function SilkRect({ x1, x2, z1, z2, outline = false, w = 0.015 }) {
  if (!outline)
    return (
      <mesh position={[(x1 + x2) / 2, SILK, (z1 + z2) / 2]} rotation={[-HALF_PI, 0, 0]}>
        <planeGeometry args={[x2 - x1, z2 - z1]} />
        <meshBasicMaterial color={BLUE} />
      </mesh>
    )
  const sides = [
    [(x1 + x2) / 2, z1, x2 - x1, w],
    [(x1 + x2) / 2, z2, x2 - x1, w],
    [x1, (z1 + z2) / 2, w, z2 - z1],
    [x2, (z1 + z2) / 2, w, z2 - z1],
  ]
  return sides.map(([x, z, a, b], i) => (
    <mesh key={i} position={[x, SILK, z]} rotation={[-HALF_PI, 0, 0]}>
      <planeGeometry args={[a, b]} />
      <meshBasicMaterial color={BLUE} />
    </mesh>
  ))
}

function NucleoLogo(props) {
  return (
    <group {...props}>
      {[
        [0, 0, 0.11],
        [-0.13, 0.05, 0.07],
        [0.13, 0.05, 0.07],
        [0, -0.13, 0.07],
      ].map(([x, z, r], i) => (
        <mesh key={i} position={[x, 0, z]} rotation={[-HALF_PI, 0, 0]}>
          <circleGeometry args={[r, 24]} />
          <meshBasicMaterial color={ST_BLUE} />
        </mesh>
      ))}
      <Silk position={[0, 0, 0.36]} size={0.13} color={ST_BLUE}>Nucleo</Silk>
    </group>
  )
}

function EsdMark(props) {
  return (
    <mesh {...props} rotation={[-HALF_PI, 0, HALF_PI]}>
      <circleGeometry args={[0.4, 3]} />
      <meshBasicMaterial color={ST_BLUE} />
    </mesh>
  )
}

// ── passives traced from the photo: [x, z, rotation°, type] ──────────
const PASSIVE_STYLE = {
  r: { size: [0.16, 0.05, 0.08], color: '#1f1f1f' },
  c: { size: [0.16, 0.07, 0.08], color: '#a9865a' },
  cl: { size: [0.24, 0.1, 0.13], color: '#a9865a' },
  d: { size: [0.2, 0.08, 0.12], color: '#2a2a2a' },
  sb: { size: [0.14, 0.02, 0.08], color: '#c9ccd1' },
}

function PassiveList({ items }) {
  return items.map(([x, z, deg, type], i) => (
    <Passive key={i} position={[x, TOP, z]} rotation={[0, (deg * Math.PI) / 180, 0]} {...PASSIVE_STYLE[type]} />
  ))
}

const STLINK_PASSIVES = [
  [-2.31, -3.73, 0, 'r'], [-2.31, -3.61, 0, 'r'], [-2.25, -3.24, 0, 'd'],
  [-2.31, -2.99, 0, 'r'], [-2.31, -2.83, 0, 'r'], [-2.31, -2.68, 0, 'r'], [-2.31, -2.53, 0, 'r'],
  [-0.6, -3.29, 90, 'r'], [-0.44, -3.29, 90, 'r'], [-0.28, -3.29, 90, 'c'], [-0.13, -3.29, 90, 'r'],
  [0.05, -3.29, 90, 'sb'], [0.2, -3.29, 90, 'r'], [0.35, -3.29, 90, 'r'], [0.81, -3.29, 90, 'r'], [0.98, -3.29, 90, 'r'],
  [-1.15, -2.71, 0, 'c'], [-1.15, -2.53, 0, 'c'], [-0.73, -2.27, 0, 'c'],
  [0.69, -2.93, 0, 'c'], [0.66, -2.51, 0, 'r'], [0.66, -2.33, 0, 'c'],
  [-0.45, -1.89, 90, 'r'], [-0.32, -1.89, 90, 'r'], [0.27, -1.89, 90, 'c'], [0.45, -1.89, 90, 'r'],
  [1.31, -2.51, 0, 'd'], [1.31, -2.32, 0, 'd'], [1.31, -2.12, 0, 'd'],
  [2.06, -2.44, 90, 'c'], [2.22, -2.44, 90, 'c'], [1.58, -2.05, 90, 'c'], [1.72, -2.05, 90, 'c'], [1.87, -2.05, 90, 'c'],
  [1.72, -3.29, 90, 'c'], [1.88, -3.29, 90, 'r'], [2.04, -3.29, 90, 'r'], [2.19, -3.29, 90, 'r'],
  [2.46, -3.29, 90, 'r'], [2.62, -3.29, 90, 'r'],
  [2.62, -2.43, 90, 'c'], [2.81, -2.07, 90, 'c'], [3.24, -2.43, 90, 'r'], [2.97, -2.82, 90, 'r'], [3.27, -2.82, 90, 'r'],
]

const TARGET_PASSIVES = [
  [-1.54, -1.36, 90, 'r'], [-1.7, -1.01, 90, 'r'], [-1.54, -1.01, 90, 'c'],
  [1.74, -1.04, 90, 'r'], [2.08, -1.04, 90, 'r'],
  [-2.43, -0.42, 90, 'r'], [-1.89, -0.42, 90, 'cl'], [-0.64, -0.07, 90, 'cl'],
  [0.4, 0.19, 90, 'sb'], [0.55, 0.19, 90, 'c'], [0.69, 0.19, 90, 'c'], [1.25, 0.18, 90, 'c'], [1.42, 0.18, 90, 'c'],
  [-1.58, 1.36, 0, 'c'], [-1.58, 1.61, 0, 'c'], [-1.67, 1.91, 0, 'r'], [-1.67, 2.09, 0, 'r'],
  [-0.97, 1.41, 0, 'r'], [-0.97, 1.57, 0, 'r'],
  [-1.75, 3.15, 0, 'sb'], [-1.75, 3.3, 0, 'sb'], [-1.75, 3.45, 0, 'sb'], [-1.75, 3.6, 0, 'sb'],
]
