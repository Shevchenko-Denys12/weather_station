import { useBoardStore } from '../store/useBoardStore'
import { ENV_DEFAULTS } from './environment'

/**
 * Non-volatile / always-powered hardware of the HW-084 module: the DS3231 clock (battery-backed)
 * and the AT24C32 EEPROM. They live at module level, not inside the HAL, so Stop / Reset / NRST
 * of the MCU leaves the time and the stored history untouched, like on the real board.
 */

// ── history record (C/README.md, "Скільки історії влізе в AT24C32") ────────────────
export const REC_SIZE = 16
export const REC_COUNT = 256
export const EEPROM_SIZE = REC_SIZE * REC_COUNT // 4096

/** CRC-8, polynomial 0x07, init 0. Same routine as crc8.h in the C source. */
export function crc8(bytes, len = bytes.length, offset = 0) {
  let crc = 0
  for (let i = 0; i < len; i++) {
    crc ^= bytes[offset + i]
    for (let b = 0; b < 8; b++) crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff
  }
  return crc
}

/** Little-endian layout of the packed C struct `Record` (16 bytes, CRC last). */
export function packRecord(r) {
  const bytes = new Uint8Array(REC_SIZE)
  const v = new DataView(bytes.buffer)
  v.setUint32(0, r.time, true)
  v.setInt16(4, r.t_x100, true)
  v.setInt16(6, r.t_bmp_x100, true)
  v.setInt8(8, r.t_dht_x2)
  v.setUint16(9, r.p_x10, true)
  v.setUint8(11, r.h)
  v.setUint8(12, r.flags ?? 0)
  v.setUint16(13, r.seq & 0xffff, true)
  bytes[15] = crc8(bytes, REC_SIZE - 1)
  return bytes
}

/** Record at `offset`, or null when the CRC does not match (erased 0xFF or corrupt slot). */
export function unpackRecord(bytes, offset = 0) {
  if (crc8(bytes, REC_SIZE - 1, offset) !== bytes[offset + 15]) return null
  const v = new DataView(bytes.buffer, bytes.byteOffset + offset, REC_SIZE)
  return {
    time: v.getUint32(0, true),
    t_x100: v.getInt16(4, true),
    t_bmp_x100: v.getInt16(6, true),
    t_dht_x2: v.getInt8(8),
    p_x10: v.getUint16(9, true),
    h: v.getUint8(11),
    flags: v.getUint8(12),
    seq: v.getUint16(13, true),
  }
}

// ── DS3231 ────────────────────────────────────────────────────────────────────────
const QUARTER_MS = 15 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

let simMs = Math.floor(Date.now() / 1000) * 1000 // the clock starts at the visitor's wall-clock time
let lastReal = performance.now()
let alarm = null // { min, sec } — Alarm 1, matches minutes + seconds
let alarmCheckedMs = simMs
let a1f = false

/** RTC time in ms since the epoch; runs `rtcSpeed` × faster than real time (see setRtcSpeed). */
export function rtcNowMs() {
  const real = performance.now()
  simMs += (real - lastReal) * useBoardStore.getState().rtcSpeed
  lastReal = real
  return simMs
}

/** Change the RTC speed without a jump: integrate the elapsed time at the old speed first. */
export function setRtcSpeed(speed) {
  rtcNowMs()
  useBoardStore.getState().setRtcSpeed(speed)
}

export function rtcGetTime() {
  const ms = rtcNowMs()
  const d = new Date(ms)
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    min: d.getMinutes(),
    sec: d.getSeconds(),
    unix: Math.floor(ms / 1000),
  }
}

/** Program Alarm 1 (match minutes + seconds); this also clears A1F, so SQW is released (high). */
export function rtcSetAlarm1(min, sec) {
  alarm = { min, sec }
  alarmCheckedMs = rtcNowMs()
  a1f = false
}

/** Polled by the HAL: did the alarm time pass since the last call? Sets A1F, i.e. SQW goes low. */
export function rtcAlarmDue() {
  const now = rtcNowMs()
  if (alarm && !a1f) {
    // next alarm instant after the last check (the match repeats every hour)
    let at = Math.floor(alarmCheckedMs / HOUR_MS) * HOUR_MS + alarm.min * 60000 + alarm.sec * 1000
    if (at <= alarmCheckedMs) at += HOUR_MS
    if (at <= now) a1f = true
  }
  alarmCheckedMs = now
  return a1f
}

// ── AT24C32 ───────────────────────────────────────────────────────────────────────
const eeprom = new Uint8Array(EEPROM_SIZE).fill(0xff)

export const eepromRead = (addr, len) => eeprom.slice(addr, addr + len)
export const eepromWrite = (addr, bytes) => eeprom.set(bytes, addr)

/**
 * The station has "been running" for 64 h: fill the ring with 256 plausible records
 * (daily temperature swing, slow pressure drift, humidity opposite to temperature),
 * the newest one at the last quarter hour before the RTC start time.
 */
function seedHistory() {
  let s = 42 // mulberry32, deterministic
  const rnd = () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const newest = Math.floor(simMs / QUARTER_MS) * QUARTER_MS
  const hourAt = (i) => {
    const d = new Date(newest - (REC_COUNT - 1 - i) * QUARTER_MS)
    return d.getHours() + d.getMinutes() / 60
  }
  const day = (i) => Math.cos((2 * Math.PI * (hourAt(i) - 15)) / 24) // +1 at 15:00
  const tCurve = (i) => 2.6 * day(i)
  const pCurve = (i) => 4.5 * Math.sin((2 * Math.PI * i) / 170)
  const hCurve = (i) => -7 * day(i)
  // shift each curve so that it ends at the default slider value (no jump when new records follow)
  const last = REC_COUNT - 1
  const t0 = ENV_DEFAULTS.temperature - tCurve(last)
  const p0 = ENV_DEFAULTS.pressure - pCurve(last)
  const h0 = ENV_DEFAULTS.humidity - hCurve(last)
  for (let i = 0; i < REC_COUNT; i++) {
    const ts = newest - (last - i) * QUARTER_MS
    const t = t0 + tCurve(i) + (rnd() - 0.5) * 0.3
    const p = p0 + pCurve(i) + (rnd() - 0.5)
    const h = h0 + hCurve(i) + (rnd() - 0.5) * 2
    const seq = 1000 + i
    const rec = {
      time: Math.floor(ts / 1000),
      t_x100: Math.round(t * 100),
      t_bmp_x100: Math.round((t + 0.1) * 100),
      t_dht_x2: Math.round((t - 0.4) * 2),
      p_x10: Math.round(p * 10),
      h: Math.round(h),
      flags: 0,
      seq,
    }
    eepromWrite((seq % REC_COUNT) * REC_SIZE, packRecord(rec))
  }
}
seedHistory()
