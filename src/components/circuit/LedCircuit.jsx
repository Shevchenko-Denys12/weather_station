import { RoundedBox, Text } from '@react-three/drei'
import { GROUND_Y, PITCH } from '../../data/layout'
import { ARDUINO_TO_MCU } from '../../data/pinout'
import { Interactive } from '../board/Interactive'
import { AxialResistor, ThtLed } from './parts'

/**
 * LED1 (red, 5 mm) and its 220 Ω resistor. They used to blink on D7 (PA8)
 * from the breadboard; the weather-station wiring (C/README.md) frees that
 * space, so both parts now sit in a piece of anti-static foam next to the
 * breadboard, unconnected. The demo firmware still toggles PA8.
 *
 * To put LED1 back: give it holes on the breadboard and add its two wires to
 * data/wiring.js (D7 → resistor → anode, cathode → GND).
 */
export const SIGNAL_PIN = 'D7'
export const SIGNAL_MCU_PIN = ARDUINO_TO_MCU[SIGNAL_PIN] // 'PA8'

const FOAM = { pos: [11.6, GROUND_Y, 1.4], size: [1.4, 0.35, 0.9] }
const TOP = FOAM.size[1]

export default function LedCircuit() {
  const [x, y, z] = FOAM.pos
  return (
    <group position={[x, y, z]}>
      <RoundedBox args={FOAM.size} radius={0.03} smoothness={2} position={[0, TOP / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#26282d" roughness={1} />
      </RoundedBox>

      <Interactive id="led1" position={[-0.35, TOP, 0]} labelOffset={[0, 1.25, 0]}>
        <ThtLed on={false} span={PITCH} />
      </Interactive>
      <Interactive id="r_led" position={[0.3, TOP, 0]} labelOffset={[0, 0.6, 0]}>
        <AxialResistor span={3 * PITCH} />
      </Interactive>

      <Text rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, FOAM.size[2] / 2 + 0.22]} fontSize={0.13} color="#64748b" anchorX="center" anchorY="middle">
        не підключено
      </Text>
    </group>
  )
}
