import { useBoardStore } from '../../store/useBoardStore'
import { ENV_FIELDS } from '../../simulator/environment'
import { setRtcSpeed } from '../../simulator/devices'

/** DS3231 speed presets: at ×60 one 15-minute logging interval takes 15 s. */
const RTC_SPEEDS = [1, 60, 300, 900]

/**
 * "Оточення": range sliders for the ambient temperature, pressure and humidity.
 * The simulated BMP280 / DHT11 measure these values (plus their own bias, drift and noise),
 * so moving a slider changes what the firmware reads on its next sample, also while running.
 */
export default function EnvironmentPanel() {
  const env = useBoardStore((s) => s.env)
  const setEnv = useBoardStore((s) => s.setEnv)
  const resetEnv = useBoardStore((s) => s.resetEnv)
  const rtcSpeed = useBoardStore((s) => s.rtcSpeed)

  return (
    <section className="shrink-0 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2">
      <header className="mb-1.5 flex items-center gap-2 text-[11px]">
        <span className="font-mono uppercase tracking-wider text-slate-400">Оточення</span>
        <span className="text-slate-600">що вимірюють датчики</span>
        <button onClick={resetEnv} className="ml-auto text-slate-500 transition hover:text-slate-200">
          скинути
        </button>
      </header>
      <div className="grid grid-cols-[5.5rem_1fr_4.75rem] items-center gap-x-3 gap-y-1">
        {ENV_FIELDS.map(({ key, label, unit, min, max, step, digits }) => (
          <Row key={key} label={label}>
            <input
              type="range"
              aria-label={label}
              min={min}
              max={max}
              step={step}
              value={env[key]}
              onChange={(e) => setEnv({ [key]: Number(e.target.value) })}
              className="h-4 w-full cursor-pointer accent-cyan-400"
            />
            <span className="text-right font-mono text-[12px] text-led">
              {env[key].toFixed(digits)} <span className="text-slate-500">{unit}</span>
            </span>
          </Row>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 border-t border-ink-700 pt-2">
        <span title="Швидкість годинника DS3231 відносно реального часу: запис в EEPROM іде кожні 15 хв за ним" className="text-[12px] text-slate-400">
          Годинник RTC
        </span>
        <div className="ml-auto flex gap-1">
          {RTC_SPEEDS.map((v) => (
            <button
              key={v}
              onClick={() => setRtcSpeed(v)}
              aria-pressed={rtcSpeed === v}
              className={`rounded px-2 py-0.5 font-mono text-[11px] transition ${
                rtcSpeed === v ? 'bg-led/15 text-led ring-1 ring-led/40' : 'text-slate-400 ring-1 ring-ink-600 hover:bg-ink-800'
              }`}
            >
              ×{v}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/** One grid row: label | control | value (the control and value are the children). */
function Row({ label, children }) {
  return (
    <>
      <span className="text-[12px] text-slate-400">{label}</span>
      {children}
    </>
  )
}
