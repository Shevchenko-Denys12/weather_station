/**
 * Simulated ambient conditions, controlled from the "Оточення" panel.
 * The sensor models (sensors.js) read these values and add their own bias, drift and noise.
 * No imports on purpose: the store, the sensors and the UI all read this file.
 */

export const ENV_DEFAULTS = { temperature: 22.5, pressure: 1027.5, humidity: 45 }

/** Slider limits; they stay inside the working ranges of both sensors. */
export const ENV_FIELDS = [
  { key: 'temperature', label: 'Температура', unit: '°C', min: 0, max: 50, step: 0.1, digits: 1 },
  { key: 'pressure', label: 'Тиск', unit: 'hPa', min: 950, max: 1060, step: 0.5, digits: 1 },
  { key: 'humidity', label: 'Вологість', unit: '%', min: 20, max: 90, step: 1, digits: 0 },
]
