import { useEffect, useMemo } from 'react'
import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'
import { useBoardStore } from '../../store/useBoardStore'
import { HEIGHT, WIDTH } from '../../simulator/ssd1306'
import { MODULES } from '../../data/modules'
import { pinsOf } from '../../data/pinout'
import { Interactive } from '../board/Interactive'
import { PinLabel, silkTint, usePinColors } from '../board/pins'
import { ModuleFrame, ModuleHeader, ModuleSilk, PadRing, PcbShape, SILK_WHITE, SOLDER_MASK } from './shared'

/**
 * JMD0.96D-1: 0.96" monochrome OLED, 128 × 64, SSD1306, I²C (GND, VCC, SCL, SDA).
 * PCB ≈ 27.3 × 27.8 mm with Ø2 mm corner holes; glass 26.7 × 19.26 × 1.3 mm,
 * active area 21.74 × 10.86 mm; FPC folds behind the glass at the bottom edge.
 * Sizes from the TOJMD096 family datasheet; check pin order on your board's silkscreen.
 * Plugged into the breadboard (column f, rows 55–58), overhanging the front half.
 * Display content comes from the store (`oled`, the 128 × 64 pixel frame pushed by the simulated firmware);
 * it is redrawn onto a canvas texture only when a new frame arrives, never per render frame.
 */
const M = MODULES.OLED
const { w, l, t } = M.pcb
const HOLES = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * 1.165, sz * 1.19, 0.1]))
const GLASS = { w: 2.67, l: 1.926, h: 0.13, z: 0.103 }
const ACTIVE = { w: 2.174, l: 1.086, z: -0.02 }

const CELL = 4 // canvas px per SSD1306 pixel: canvas 512 × 256
const GAP = 0.6 // dark gap between lit pixels, in canvas px
const PIXEL_ON = '#9fe3ff'

/** Canvas texture of the 128 × 64 panel; `frame` = Uint8Array(128 * 64) of 0 / 1, or null (display off). */
function useOledTexture(frame) {
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH * CELL
    canvas.height = HEIGHT * CELL
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.minFilter = LinearFilter
    texture.anisotropy = 8
    return { canvas, texture }
  }, [])

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#020304'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (frame) {
      ctx.fillStyle = PIXEL_ON
      for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
          if (frame[y * WIDTH + x]) ctx.fillRect(x * CELL, y * CELL, CELL - GAP, CELL - GAP)
        }
      }
    }
    texture.needsUpdate = true
  }, [frame, canvas, texture])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

export default function OledJmd096() {
  const colorOf = usePinColors()
  const pins = pinsOf('OLED')
  const top = t + 0.002
  const frame = useBoardStore((st) => st.oled)
  const screen = useOledTexture(frame)

  return (
    <ModuleFrame module={M}>
      <Interactive id={M.id} labelOffset={[0, 0.7, -1.0]}>
        <PcbShape w={w} l={l} t={t} color={SOLDER_MASK.blue} chamfer={0.03} holes={HOLES} />
        {HOLES.map(([x, z, r]) => (
          <PadRing key={`${x}${z}`} position={[x, 0, z]} y={top} r={r} ring={0.04} />
        ))}

        {/* glass panel + polariser + active area */}
        <group position={[0, t, GLASS.z]}>
          <mesh position={[0, GLASS.h / 2, 0]} castShadow>
            <boxGeometry args={[GLASS.w, GLASS.h, GLASS.l]} />
            <meshPhysicalMaterial color="#14171c" roughness={0.1} metalness={0.1} clearcoat={1} clearcoatRoughness={0.05} envMapIntensity={0.35} />
          </mesh>
          <mesh position={[0, GLASS.h + 0.001, ACTIVE.z - GLASS.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[ACTIVE.w + 0.12, ACTIVE.l + 0.12]} />
            <meshPhysicalMaterial color="#020304" roughness={0.15} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={0.25} />
          </mesh>
          {/* live content; unlit and not tone-mapped, like an emissive panel */}
          <mesh position={[0, GLASS.h + 0.002, ACTIVE.z - GLASS.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <planeGeometry args={[ACTIVE.w, ACTIVE.l]} />
            <meshBasicMaterial map={screen} toneMapped={false} />
          </mesh>
          {/* FPC tail folding behind the glass */}
          <mesh position={[0, GLASS.h / 2 - 0.02, GLASS.l / 2 + 0.03]} castShadow>
            <boxGeometry args={[1.0, GLASS.h - 0.02, 0.06]} />
            <meshStandardMaterial color="#c8701e" roughness={0.5} />
          </mesh>
        </group>

        {pins.map((p) => (
          <PinLabel key={p.id} pin={p} position={[p.local[0], top, -0.98]} anchorX="center" fontSize={0.065} color={silkTint(colorOf(p, SILK_WHITE))}>
            {p.label}
          </PinLabel>
        ))}
        <ModuleSilk y={top} position={[0.72, 0, 1.24]} size={0.065}>JMD0.96D-1</ModuleSilk>
        <ModuleSilk y={top} position={[-0.8, 0, 1.24]} size={0.065}>IIC · 128×64</ModuleSilk>
      </Interactive>
      <ModuleHeader group="OLED" pcbT={t} />
    </ModuleFrame>
  )
}
