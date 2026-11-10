import { BB_POS, BB_ROT } from '../../data/breadboard'
import { WIRES } from '../../data/wiring'
import { Interactive } from '../board/Interactive'
import Bmp280Module from '../library/Bmp280Module'
import Dht11 from '../library/Dht11'
import Hw084Module from '../library/Hw084Module'
import OledJmd096 from '../library/OledJmd096'
import TactSwitch12 from '../library/TactSwitch12'
import Breadboard from './Breadboard'
import LedCircuit from './LedCircuit'
import { JumperWire } from './parts'

/**
 * The weather station as wired in C/README.md: full-size breadboard with OLED,
 * BMP280, DHT11 module and SW1, HW-084 on the table, and every wire from
 * data/wiring.js. Each wire is a separate selectable part ("wire:<id>").
 * (The 3-pin DHT11 module carries its own pull-up and capacitor, so R1 / C1
 * from the bare-sensor variant are not needed.)
 */
export default function WeatherStation() {
  return (
    <>
      <group position={BB_POS} rotation-y={BB_ROT}>
        <Interactive id="breadboard" labelOffset={[-3.2, 1.2, -8.6]}>
          <Breadboard />
        </Interactive>
      </group>

      <OledJmd096 />
      <Bmp280Module />
      <Dht11 />
      <TactSwitch12 />
      <Hw084Module />

      {WIRES.map((w) => (
        <Interactive key={w.id} id={`wire:${w.id}`} labelOffset={labelAt(w)}>
          <JumperWire from={w.from} to={w.to} color={w.color} lift={w.lift} fromDir={w.fromDir} toDir={w.toDir} via={w.via} />
        </Interactive>
      ))}

      {/* LED1 + 220 Ω are no longer on the breadboard: kept aside, unconnected */}
      <LedCircuit />
    </>
  )
}

/** Tooltip anchor: above the middle of the wire. */
function labelAt({ from, to, via, lift = 0.7 }) {
  const mid = via?.length ? via[Math.floor(via.length / 2)] : from.map((v, i) => (v + to[i]) / 2)
  return [mid[0], (via?.length ? mid[1] : Math.max(from[1], to[1]) + lift) + 0.35, mid[2]]
}
