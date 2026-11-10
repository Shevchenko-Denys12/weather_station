/**
 * Simulated sensor readings for the weather station.
 *
 * Every reading = ambient value (from the Environment panel) + sensor bias
 * + a slowly wandering drift + per-sample jitter:
 *
 *   BMP280  pressure     jitter ±5…10 hPa (amplitude re-rolled every sample), drift ±0.3 hPa
 *   BMP280  temperature  jitter ±0.2 °C, bias +0.1 °C, drift ±0.3 °C
 *   DHT11   temperature  jitter ±0.2 °C, bias −0.4 °C, drift ±0.3 °C
 *   DHT11   humidity     jitter ±2 %RH,  drift ±1.5 %RH
 *
 * The biases cancel in the 0.8 / 0.2 weighted mean used by the firmware, so with the sliders at
 * T the station shows ≈ T. The large pressure jitter is what the 10-sample average smooths out.
 */

const CHANNELS = {
  bmpPressure: { bias: 0, drift: 0.3, step: 0.05, jitter: [5, 10] },
  bmpTemp: { bias: 0.1, drift: 0.3, step: 0.03, jitter: [0.2, 0.2] },
  dhtTemp: { bias: -0.4, drift: 0.3, step: 0.03, jitter: [0.2, 0.2] },
  dhtHumidity: { bias: 0, drift: 1.5, step: 0.2, jitter: [2, 2] },
}

const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round = (v, digits) => Math.round(v * 10 ** digits) / 10 ** digits

/** One quantity: `sample(ambient)` returns ambient + bias + drift + jitter. */
function createChannel({ bias, drift, step, jitter: [jMin, jMax] }) {
  let offset = 0
  return {
    sample(ambient) {
      offset = clamp(offset + rand(-step, step), -drift, drift)
      return ambient + bias + offset + rand(-1, 1) * rand(jMin, jMax)
    },
  }
}

/**
 * Fresh set of sensors for one simulation run (drift starts over after Reset).
 * `getEnv()` returns the current ambient { temperature, pressure, humidity }.
 * Values are rounded to what the driver would report: 0.01 for the BMP280, 0.1 for the DHT11
 * (a real DHT11 has 1 °C / 1 % resolution; the finer step is a simulator convenience).
 */
export function createSensors(getEnv) {
  const ch = Object.fromEntries(Object.entries(CHANNELS).map(([k, c]) => [k, createChannel(c)]))
  return {
    bmp280: () => {
      const env = getEnv()
      return {
        temperature: round(clamp(ch.bmpTemp.sample(env.temperature), -40, 85), 2),
        pressure: round(clamp(ch.bmpPressure.sample(env.pressure), 300, 1100), 2),
      }
    },
    dht11: () => {
      const env = getEnv()
      return {
        temperature: round(clamp(ch.dhtTemp.sample(env.temperature), 0, 50), 1),
        humidity: round(clamp(ch.dhtHumidity.sample(env.humidity), 0, 100), 1),
      }
    },
  }
}
