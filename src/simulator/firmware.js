/**
 * Firmware shown in the Code Viewer + its JavaScript "twin" that the
 * simulator actually executes.
 *
 * The C source is display-only. `main()` below mirrors it statement by
 * statement and calls `at('<snippet>')` before each one, so the viewer
 * can highlight the line that is "executing". Snippets are matched
 * against the source text (first occurrence), so line numbers never have
 * to be hard-coded.
 *
 * When you write the real firmware, replace SOURCE with your main.c and
 * update the twin accordingly.
 */

import { REC_COUNT, REC_SIZE, packRecord, unpackRecord } from './devices'

export const FILE_NAME = 'Core/Src/main.c'

export const SOURCE = `/**
 * main.c — NUCLEO-F411RE · Weather station
 *
 * I2C1 (PB8 SCL, PB9 SDA): BMP280 0x76, SSD1306 OLED 0x3C,
 *                          DS3231 0x68, AT24C32 0x57
 * PB10 (D6): DHT11 data    PA10 (D2): SW1, EXTI10    PB5 (D4): DS3231 SQW, EXTI5
 *
 * Measuring: 10 samples, 200 ms apart, per report (every 2 s)
 *   P = mean of the 10 BMP280 pressures
 *   H = mean of the 10 DHT11 humidities
 *   T = 0.8 * T_BMP280 + 0.2 * T_DHT11 (weights ~ 1 / error^2)
 *
 * Logging: every 15 min the DS3231 alarm pulls SQW low (EXTI5); the latest
 * report is then appended to a ring of 256 records (16 bytes each) in the
 * AT24C32. After a reset the ring is read back and sorted by seq.
 *
 * SW1 (falling edge, 40 ms debounce) cycles the four OLED screens:
 *   1/4 current data: date, time, T, H, P
 *   2/4 history: min / max of T, P, H over the stored period
 *   3/4 temperature graph, last 128 records (32 h)
 *   4/4 pressure graph, last 128 records (32 h)
 */
#include "main.h"
#include <stdio.h>
#include <string.h>
#include <math.h>
#include "bmp280.h"
#include "dht11.h"
#include "ds3231.h"
#include "ssd1306.h"
#include "crc8.h"

#define SAMPLES        10      /* samples per report */
#define SAMPLE_MS      200     /* sampling interval  */
#define T_WEIGHT_BMP   0.8f
#define T_WEIGHT_DHT   0.2f

#define EEPROM_ADDR    0x57
#define REC_SIZE       16
#define REC_COUNT      256     /* 4096 / 16 */
#define GRAPH_POINTS   128     /* one point per OLED column */
#define DEBOUNCE_MS    40

typedef struct __attribute__((packed))
{
  uint32_t time;         /* Unix seconds */
  int16_t  t_x100;       /* T after the weighted mean, x100 degC */
  int16_t  t_bmp_x100;
  int8_t   t_dht_x2;     /* x2 degC, 0.5 degC step */
  uint16_t p_x10;        /* x10 hPa */
  uint8_t  h;            /* % */
  uint8_t  flags;
  uint16_t seq;
  uint8_t  crc;          /* CRC-8 of the first 15 bytes */
} Record;                /* 16 bytes */

UART_HandleTypeDef huart2;
I2C_HandleTypeDef hi2c1;

static BMP280_Data bmp;
static DHT11_Data dht;
static float cur_t, cur_p, cur_h;          /* latest report */
static uint8_t have_report = 0;

static Record history[REC_COUNT];          /* oldest first */
static uint16_t hist_n = 0;
static uint16_t next_seq = 1;
static uint8_t next_min = 0;               /* minute of the next alarm */

static volatile uint8_t screen = 0;        /* 0..3 */
static volatile uint8_t redraw = 1;
static volatile uint8_t log_due = 0;
static volatile uint32_t last_edge = 0;

void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_I2C1_Init(void);
static void MX_USART2_UART_Init(void);

/* ---- OLED helpers ---- */

/* Write s at text row 0..7 (6x8 font, 21 columns) */
static void oled_print(uint8_t row, const char *s)
{
  ssd1306_SetCursor(0, row * 8);
  ssd1306_WriteString((char *)s, Font_6x8, White);
}

/* Clear the screen, title on the left, "n/4" on the right, rule under them */
static void draw_header(const char *title)
{
  char page[4];
  ssd1306_Fill(Black);
  oled_print(0, title);
  snprintf(page, sizeof(page), "%d/4", screen + 1);
  ssd1306_SetCursor(108, 0);
  ssd1306_WriteString(page, Font_6x8, White);
  ssd1306_Line(0, 9, 127, 9, White);
}

static void draw_current(const DS3231_Time *tm)
{
  char s[24];
  snprintf(s, sizeof(s), "%02u.%02u.%02u %02u:%02u:%02u",
           tm->day, tm->month, tm->year % 100, tm->hour, tm->min, tm->sec);
  draw_header(s);
  if (!have_report)
  {
    oled_print(4, "    measuring...");
    return;
  }
  snprintf(s, sizeof(s), "T: %5.1f C", cur_t);
  oled_print(2, s);
  snprintf(s, sizeof(s), "H: %5.1f %%", cur_h);
  oled_print(3, s);
  snprintf(s, sizeof(s), "P: %6.1f hPa", cur_p);
  oled_print(4, s);
  snprintf(s, sizeof(s), "EEPROM: %3u/%u rec", hist_n, REC_COUNT);
  oled_print(6, s);
  snprintf(s, sizeof(s), "next save at :%02u", next_min);
  oled_print(7, s);
}

static void draw_history(void)
{
  char s[24];
  draw_header("HISTORY");
  if (hist_n == 0)
  {
    oled_print(4, "    NO DATA YET");
    return;
  }
  float t_lo = 1e9f, t_hi = -1e9f, p_lo = 1e9f, p_hi = -1e9f, h_lo = 1e9f, h_hi = -1e9f;
  for (uint16_t i = 0; i < hist_n; i++)
  {
    float t = history[i].t_x100 / 100.0f;
    float p = history[i].p_x10 / 10.0f;
    float h = history[i].h;
    if (t < t_lo) t_lo = t;
    if (t > t_hi) t_hi = t;
    if (p < p_lo) p_lo = p;
    if (p > p_hi) p_hi = p;
    if (h < h_lo) h_lo = h;
    if (h > h_hi) h_hi = h;
  }
  snprintf(s, sizeof(s), "%u rec = %lu h", hist_n,
           (history[hist_n - 1].time - history[0].time + 900) / 3600);
  oled_print(2, s);
  oled_print(3, "     min    max");
  snprintf(s, sizeof(s), "T %6.1f %6.1f C", t_lo, t_hi);
  oled_print(4, s);
  snprintf(s, sizeof(s), "P %6.1f %6.1f hPa", p_lo, p_hi);
  oled_print(5, s);
  snprintf(s, sizeof(s), "H %6.0f %6.0f %%", h_lo, h_hi);
  oled_print(6, s);
}

static float rec_t(const Record *r) { return r->t_x100 / 100.0f; }
static float rec_p(const Record *r) { return r->p_x10 / 10.0f; }

/* Line graph of the last 128 records, newest at the right edge */
static void draw_graph(char tag, float (*val)(const Record *), float min_span, int digits, const char *unit)
{
  char title[24];
  uint16_t n = (hist_n < GRAPH_POINTS) ? hist_n : GRAPH_POINTS;
  const Record *rec = &history[hist_n - n];
  if (n < 2)
  {
    snprintf(title, sizeof(title), "%c", tag);
    draw_header(title);
    oled_print(4, "    NO DATA YET");
    return;
  }

  float lo = 1e9f, hi = -1e9f;
  for (uint16_t i = 0; i < n; i++)
  {
    float v = val(&rec[i]);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  snprintf(title, sizeof(title), "%c %.*f..%.*f %s", tag, digits, lo, digits, hi, unit);
  draw_header(title);

  if (hi - lo < min_span)                  /* keep a flat trace from filling the screen */
  {
    float mid = (hi + lo) / 2.0f;
    lo = mid - min_span / 2.0f;
    hi = mid + min_span / 2.0f;
  }
  int px = 0, py = 0;
  for (uint16_t i = 0; i < n; i++)
  {
    int x = GRAPH_POINTS - n + i;
    int y = 63 - (int)lroundf((val(&rec[i]) - lo) / (hi - lo) * 52.0f);   /* y = 11..63 */
    if (i > 0) ssd1306_Line(px, py, x, y, White);
    px = x;
    py = y;
  }
}

static void draw_screen(const DS3231_Time *tm)
{
  switch (screen)
  {
    case 0:  draw_current(tm); break;
    case 1:  draw_history(); break;
    case 2:  draw_graph('T', rec_t, 2.0f, 1, "C"); break;
    default: draw_graph('P', rec_p, 4.0f, 0, "hPa"); break;
  }
  ssd1306_UpdateScreen();
}

/* ---- history in the AT24C32 ---- */

/* Read the whole ring, keep the valid records in seq order */
static void history_load(void)
{
  static uint8_t raw[REC_COUNT * REC_SIZE];
  HAL_I2C_Mem_Read(&hi2c1, EEPROM_ADDR << 1, 0, I2C_MEMADD_SIZE_16BIT, raw, sizeof(raw), HAL_MAX_DELAY);

  int newest = -1;
  uint16_t best = 0;
  for (int i = 0; i < REC_COUNT; i++)
  {
    const Record *r = (const Record *)&raw[i * REC_SIZE];
    if (crc8(&raw[i * REC_SIZE], REC_SIZE - 1) != r->crc) continue;     /* erased or corrupt */
    if (newest < 0 || (int16_t)(r->seq - best) > 0)
    {
      newest = i;
      best = r->seq;
    }
  }
  if (newest < 0) return;

  next_seq = best + 1;
  for (int k = 1; k <= REC_COUNT; k++)     /* walk the ring from the oldest slot */
  {
    int i = (newest + k) % REC_COUNT;
    if (crc8(&raw[i * REC_SIZE], REC_SIZE - 1) == raw[i * REC_SIZE + REC_SIZE - 1])
      memcpy(&history[hist_n++], &raw[i * REC_SIZE], REC_SIZE);
  }
}

/* Append the latest report as the next record */
static void history_log(const DS3231_Time *tm)
{
  Record r = {0};
  r.time       = tm->unix;
  r.t_x100     = (int16_t)lroundf(cur_t * 100.0f);
  r.t_bmp_x100 = (int16_t)lroundf(bmp.temperature * 100.0f);
  r.t_dht_x2   = (int8_t)lroundf(dht.temperature * 2.0f);
  r.p_x10      = (uint16_t)lroundf(cur_p * 10.0f);
  r.h          = (uint8_t)lroundf(cur_h);
  r.seq        = next_seq++;
  r.crc        = crc8((uint8_t *)&r, REC_SIZE - 1);

  uint16_t addr = (r.seq % REC_COUNT) * REC_SIZE;
  HAL_I2C_Mem_Write(&hi2c1, EEPROM_ADDR << 1, addr, I2C_MEMADD_SIZE_16BIT,
                    (uint8_t *)&r, REC_SIZE, HAL_MAX_DELAY);
  HAL_Delay(10);                           /* AT24C32 page write cycle */

  if (hist_n == REC_COUNT)
  {
    memmove(&history[0], &history[1], (REC_COUNT - 1) * sizeof(Record));
    hist_n--;
  }
  history[hist_n++] = r;
}

/* Alarm 1 on the next :00 / :15 / :30 / :45 (this also clears A1F, SQW goes high) */
static void alarm_arm(const DS3231_Time *tm)
{
  next_min = ((tm->min / 15) + 1) * 15 % 60;
  DS3231_SetAlarm1(&hi2c1, next_min, 0);
}

int main(void)
{
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_I2C1_Init();
  MX_USART2_UART_Init();
  ssd1306_Init();

  char line[64];
  DS3231_Time now;
  uint8_t n = 0;
  uint8_t shown_sec = 255;
  float p_sum = 0.0f;
  float h_sum = 0.0f;

  const char *hello = "Weather station: BMP280 + DHT11 + DS3231 + AT24C32, ready\\r\\n";
  HAL_UART_Transmit(&huart2, (uint8_t *)hello, strlen(hello), HAL_MAX_DELAY);

  ssd1306_Fill(Black);
  oled_print(0, "  WEATHER STATION");
  oled_print(4, " loading history...");
  ssd1306_UpdateScreen();

  history_load();
  DS3231_GetTime(&hi2c1, &now);
  alarm_arm(&now);
  int len = snprintf(line, sizeof(line), "[%6lu ms] history: %u records loaded\\r\\n",
                     HAL_GetTick(), hist_n);
  HAL_UART_Transmit(&huart2, (uint8_t *)line, len, HAL_MAX_DELAY);

  while (1)
  {
    uint32_t t0 = HAL_GetTick();

    BMP280_Read(&hi2c1, &bmp);
    DHT11_Read(&dht);
    p_sum += bmp.pressure;
    h_sum += dht.humidity;

    if (++n == SAMPLES)                    /* report ready: 10 samples taken */
    {
      cur_p = p_sum / SAMPLES;
      cur_h = h_sum / SAMPLES;
      cur_t = T_WEIGHT_BMP * bmp.temperature + T_WEIGHT_DHT * dht.temperature;
      have_report = 1;
      n = 0;
      p_sum = 0.0f;
      h_sum = 0.0f;
      redraw = 1;

      len = snprintf(line, sizeof(line), "[%6lu ms] T=%.1f C  P=%.1f hPa  H=%.1f %%\\r\\n",
                     HAL_GetTick(), cur_t, cur_p, cur_h);
      HAL_UART_Transmit(&huart2, (uint8_t *)line, len, HAL_MAX_DELAY);
    }

    DS3231_GetTime(&hi2c1, &now);

    if (log_due)                           /* set by the SQW interrupt */
    {
      log_due = 0;
      if (have_report)
      {
        history_log(&now);
        len = snprintf(line, sizeof(line), "[%6lu ms] EEPROM: record #%u saved (%u/%u)\\r\\n",
                       HAL_GetTick(), history[hist_n - 1].seq, hist_n, REC_COUNT);
        HAL_UART_Transmit(&huart2, (uint8_t *)line, len, HAL_MAX_DELAY);
      }
      alarm_arm(&now);
      redraw = 1;
    }

    if (redraw || (screen == 0 && now.sec != shown_sec))   /* the clock ticks on screen 1 */
    {
      redraw = 0;
      shown_sec = now.sec;
      draw_screen(&now);
    }

    uint32_t spent = HAL_GetTick() - t0;
    if (spent < SAMPLE_MS) HAL_Delay(SAMPLE_MS - spent);
  }
}

/* EXTI9_5 / EXTI15_10 IRQ: SQW alarm (PB5) and SW1 (PA10), both falling edge */
void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin)
{
  if (GPIO_Pin == SW1_Pin)
  {
    uint32_t tick = HAL_GetTick();
    if (tick - last_edge > DEBOUNCE_MS)    /* ignore contact bounce */
    {
      screen = (screen + 1) % 4;
      redraw = 1;
    }
    last_edge = tick;
  }
  else if (GPIO_Pin == SQW_Pin)
  {
    log_due = 1;
  }
}

static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};
  __HAL_RCC_GPIOA_CLK_ENABLE();
  __HAL_RCC_GPIOB_CLK_ENABLE();
  __HAL_RCC_GPIOC_CLK_ENABLE();

  /* DHT11 data line — PB10 (D6), open-drain, pull-up is on the module */
  GPIO_InitStruct.Pin   = DHT11_Pin;
  GPIO_InitStruct.Mode  = GPIO_MODE_OUTPUT_OD;
  GPIO_InitStruct.Pull  = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(DHT11_GPIO_Port, &GPIO_InitStruct);

  /* SW1 — PA10 (D2) and DS3231 SQW — PB5 (D4): EXTI on the falling edge, pull-up */
  GPIO_InitStruct.Pin  = SW1_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_IT_FALLING;
  GPIO_InitStruct.Pull = GPIO_PULLUP;
  HAL_GPIO_Init(SW1_GPIO_Port, &GPIO_InitStruct);
  GPIO_InitStruct.Pin  = SQW_Pin;
  HAL_GPIO_Init(SQW_GPIO_Port, &GPIO_InitStruct);

  HAL_NVIC_SetPriority(EXTI15_10_IRQn, 0, 0);
  HAL_NVIC_EnableIRQ(EXTI15_10_IRQn);
  HAL_NVIC_SetPriority(EXTI9_5_IRQn, 1, 0);
  HAL_NVIC_EnableIRQ(EXTI9_5_IRQn);
}

/* SystemClock_Config(), MX_I2C1_Init() and MX_USART2_UART_Init() are
 * generated by STM32CubeMX and omitted here for brevity.
 * Note: %f in snprintf needs "-u _printf_float" in the linker flags. */
`

export const SOURCE_LINES = SOURCE.split('\n')

/** 1-based line number of the `nth` (default: first) source line containing `snippet`. */
export function lineOf(snippet, nth = 1) {
  let seen = 0
  for (let i = 0; i < SOURCE_LINES.length; i++) {
    if (SOURCE_LINES[i].includes(snippet) && ++seen === nth) return i + 1
  }
  throw new Error(`firmware: snippet not found: ${snippet} (#${nth})`)
}

// Pin aliases and #defines (main.h / main.c above)
const DHT11_Pin = 'PB10' // D6, DHT11 data line
const SW1_Pin = 'PA10' // D2, SW1
const SQW_Pin = 'PB5' // D4, DS3231 SQW
const SAMPLES = 10
const SAMPLE_MS = 200
const T_WEIGHT_BMP = 0.8
const T_WEIGHT_DHT = 0.2
const GRAPH_POINTS = 128
const DEBOUNCE_MS = 40

/** snprintf("%{w}.{d}f") */
const f = (v, w, d) => v.toFixed(d).padStart(w)
const z2 = (n) => String(n).padStart(2, '0')

/**
 * JS twin of main(). `HAL` is the mock from hal.js, `at` highlights a line.
 * The nested functions mirror the static functions of main.c; the variables below are its file-scope state.
 */
export async function main({ HAL, at, signal }) {
  let bmp = null
  let dht = null
  let curT = 0
  let curP = 0
  let curH = 0
  let haveReport = false
  const history = [] // oldest first
  let nextSeq = 1
  let nextMin = 0
  let screen = 0
  let redraw = true
  let logDue = false
  let lastEdge = 0

  // Interrupt handler — registered with the mock NVIC for SW1 and SQW
  const HAL_GPIO_EXTI_Callback = (pin) => {
    at('void HAL_GPIO_EXTI_Callback')
    if (pin === SW1_Pin) {
      at('if (GPIO_Pin == SW1_Pin)')
      at('uint32_t tick = HAL_GetTick();')
      const tick = HAL.GetTick()
      if (tick - lastEdge > DEBOUNCE_MS) {
        at('screen = (screen + 1) % 4;')
        screen = (screen + 1) % 4
        redraw = true
      }
      at('last_edge = tick;')
      lastEdge = tick
    } else if (pin === SQW_Pin) {
      at('log_due = 1;')
      logDue = true
    }
  }

  // ── OLED helpers ──
  const oledPrint = (row, text) => {
    HAL.OLED_SetCursor(0, row * 8)
    HAL.OLED_WriteString(text)
  }

  const drawHeader = (title) => {
    at('static void draw_header')
    HAL.OLED_Fill(0)
    oledPrint(0, title)
    HAL.OLED_SetCursor(108, 0)
    HAL.OLED_WriteString(`${screen + 1}/4`)
    HAL.OLED_Line(0, 9, 127, 9)
  }

  const drawCurrent = (tm) => {
    at('static void draw_current')
    drawHeader(`${z2(tm.day)}.${z2(tm.month)}.${z2(tm.year % 100)} ${z2(tm.hour)}:${z2(tm.min)}:${z2(tm.sec)}`)
    if (!haveReport) {
      oledPrint(4, '    measuring...')
      return
    }
    oledPrint(2, `T: ${f(curT, 5, 1)} C`)
    oledPrint(3, `H: ${f(curH, 5, 1)} %`)
    oledPrint(4, `P: ${f(curP, 6, 1)} hPa`)
    oledPrint(6, `EEPROM: ${String(history.length).padStart(3)}/${REC_COUNT} rec`)
    oledPrint(7, `next save at :${z2(nextMin)}`)
  }

  const drawHistory = () => {
    at('static void draw_history')
    drawHeader('HISTORY')
    if (history.length === 0) {
      oledPrint(4, '    NO DATA YET')
      return
    }
    let tLo = Infinity
    let tHi = -Infinity
    let pLo = Infinity
    let pHi = -Infinity
    let hLo = Infinity
    let hHi = -Infinity
    for (const r of history) {
      const t = r.t_x100 / 100
      const p = r.p_x10 / 10
      tLo = Math.min(tLo, t)
      tHi = Math.max(tHi, t)
      pLo = Math.min(pLo, p)
      pHi = Math.max(pHi, p)
      hLo = Math.min(hLo, r.h)
      hHi = Math.max(hHi, r.h)
    }
    const hours = Math.floor((history[history.length - 1].time - history[0].time + 900) / 3600)
    oledPrint(2, `${history.length} rec = ${hours} h`)
    oledPrint(3, '     min    max')
    oledPrint(4, `T ${f(tLo, 6, 1)} ${f(tHi, 6, 1)} C`)
    oledPrint(5, `P ${f(pLo, 6, 1)} ${f(pHi, 6, 1)} hPa`)
    oledPrint(6, `H ${f(hLo, 6, 0)} ${f(hHi, 6, 0)} %`)
  }

  const recT = (r) => r.t_x100 / 100
  const recP = (r) => r.p_x10 / 10

  const drawGraph = (tag, val, minSpan, digits, unit) => {
    at('static void draw_graph')
    const n = Math.min(history.length, GRAPH_POINTS)
    const rec = history.slice(history.length - n)
    if (n < 2) {
      drawHeader(tag)
      oledPrint(4, '    NO DATA YET')
      return
    }
    let lo = Infinity
    let hi = -Infinity
    for (const r of rec) {
      lo = Math.min(lo, val(r))
      hi = Math.max(hi, val(r))
    }
    drawHeader(`${tag} ${lo.toFixed(digits)}..${hi.toFixed(digits)} ${unit}`)
    if (hi - lo < minSpan) {
      const mid = (hi + lo) / 2
      lo = mid - minSpan / 2
      hi = mid + minSpan / 2
    }
    let px = 0
    let py = 0
    for (let i = 0; i < n; i++) {
      const x = GRAPH_POINTS - n + i
      const y = 63 - Math.round(((val(rec[i]) - lo) / (hi - lo)) * 52)
      if (i > 0) HAL.OLED_Line(px, py, x, y)
      px = x
      py = y
    }
  }

  const drawScreen = async (tm) => {
    at('static void draw_screen')
    if (screen === 0) drawCurrent(tm)
    else if (screen === 1) drawHistory()
    else if (screen === 2) drawGraph('T', recT, 2, 1, 'C')
    else drawGraph('P', recP, 4, 0, 'hPa')
    at('ssd1306_UpdateScreen();', 1)
    await HAL.OLED_Update()
  }

  // ── history in the AT24C32 ──
  const historyLoad = async () => {
    at('static void history_load')
    at('HAL_I2C_Mem_Read(&hi2c1, EEPROM_ADDR')
    const raw = await HAL.EEPROM_Read(0, REC_COUNT * REC_SIZE)
    at('int newest = -1;')
    let newest = -1
    let best = 0
    for (let i = 0; i < REC_COUNT; i++) {
      const r = unpackRecord(raw, i * REC_SIZE) // null = erased or CRC mismatch
      if (!r) continue
      if (newest < 0 || (((r.seq - best) << 16) >> 16) > 0) {
        newest = i
        best = r.seq
      }
    }
    if (newest < 0) return
    nextSeq = (best + 1) & 0xffff
    at('for (int k = 1; k <= REC_COUNT; k++)')
    for (let k = 1; k <= REC_COUNT; k++) {
      const r = unpackRecord(raw, ((newest + k) % REC_COUNT) * REC_SIZE)
      if (r) history.push(r)
    }
  }

  const historyLog = async (tm) => {
    at('static void history_log')
    const r = {
      time: tm.unix,
      t_x100: Math.round(curT * 100),
      t_bmp_x100: Math.round(bmp.temperature * 100),
      t_dht_x2: Math.round(dht.temperature * 2),
      p_x10: Math.round(curP * 10),
      h: Math.round(curH),
      flags: 0,
      seq: nextSeq,
    }
    at('next_seq++;')
    nextSeq = (nextSeq + 1) & 0xffff
    at('r.crc        = crc8(')
    const bytes = packRecord(r) // fills in the CRC
    const addr = (r.seq % REC_COUNT) * REC_SIZE
    at('HAL_I2C_Mem_Write(&hi2c1, EEPROM_ADDR')
    await HAL.EEPROM_Write(addr, bytes)
    at('HAL_Delay(10);')
    await HAL.Delay(10)
    if (history.length === REC_COUNT) history.shift()
    history.push(r)
  }

  const alarmArm = (tm) => {
    at('static void alarm_arm')
    nextMin = (((tm.min / 15) | 0) + 1) * 15 % 60
    at('DS3231_SetAlarm1(&hi2c1, next_min, 0);')
    HAL.RTC_SetAlarm1(nextMin, 0)
  }

  const tick = () => String(HAL.GetTick()).padStart(6)

  // ── main() ──
  at('HAL_Init();')
  HAL.Init()
  at('SystemClock_Config();')
  await HAL.step()
  at('MX_GPIO_Init();')
  HAL.GPIO_Init(DHT11_Pin, 'OUTPUT_OD')
  HAL.GPIO_Init(SW1_Pin, 'IT_FALLING', HAL_GPIO_EXTI_Callback, 'PULLUP')
  HAL.GPIO_Init(SQW_Pin, 'IT_FALLING', HAL_GPIO_EXTI_Callback, 'PULLUP')
  await HAL.step()
  at('MX_I2C1_Init();')
  HAL.I2C_Init()
  await HAL.step()
  at('MX_USART2_UART_Init();')
  HAL.UART_Init(115200)
  await HAL.step()
  at('ssd1306_Init();')
  HAL.OLED_Init()
  await HAL.step()

  at('HAL_UART_Transmit(&huart2, (uint8_t *)hello')
  HAL.UART_Transmit('Weather station: BMP280 + DHT11 + DS3231 + AT24C32, ready\r\n')

  at('ssd1306_Fill(Black);', 2)
  HAL.OLED_Fill(0)
  at('oled_print(0, "  WEATHER STATION");')
  oledPrint(0, '  WEATHER STATION')
  at('oled_print(4, " loading history...");')
  oledPrint(4, ' loading history...')
  at('ssd1306_UpdateScreen();', 2)
  await HAL.OLED_Update()

  at('history_load();')
  await historyLoad()
  at('DS3231_GetTime(&hi2c1, &now);', 1)
  let now = HAL.RTC_GetTime()
  at('alarm_arm(&now);', 1)
  alarmArm(now)
  at('int len = snprintf')
  HAL.UART_Transmit(`[${tick()} ms] history: ${history.length} records loaded\r\n`)
  at('HAL_UART_Transmit(&huart2, (uint8_t *)line, len', 1)

  let n = 0
  let shownSec = 255
  let pSum = 0
  let hSum = 0

  while (true) {
    signal.throwIfAborted()

    at('uint32_t t0 = HAL_GetTick();')
    const t0 = HAL.GetTick()
    at('BMP280_Read(&hi2c1, &bmp);')
    bmp = await HAL.BMP280_Read()
    at('DHT11_Read(&dht);')
    dht = await HAL.DHT11_Read()
    at('p_sum += bmp.pressure;')
    pSum += bmp.pressure
    at('h_sum += dht.humidity;')
    hSum += dht.humidity

    at('if (++n == SAMPLES)')
    if (++n === SAMPLES) {
      at('cur_p = p_sum / SAMPLES;')
      curP = pSum / SAMPLES
      curH = hSum / SAMPLES
      at('cur_t = T_WEIGHT_BMP')
      curT = T_WEIGHT_BMP * bmp.temperature + T_WEIGHT_DHT * dht.temperature
      at('have_report = 1;')
      haveReport = true
      n = 0
      pSum = 0
      hSum = 0
      redraw = true

      at('] T=%.1f C  P=')
      HAL.UART_Transmit(`[${tick()} ms] T=${f(curT, 0, 1)} C  P=${f(curP, 0, 1)} hPa  H=${f(curH, 0, 1)} %\r\n`)
      at('HAL_UART_Transmit(&huart2, (uint8_t *)line, len', 2)
      // simulator-only: the last raw sample that went into T
      HAL.debug(`last sample: BMP280 ${bmp.temperature.toFixed(2)} °C, DHT11 ${dht.temperature.toFixed(1)} °C`)
    }

    at('DS3231_GetTime(&hi2c1, &now);', 2)
    now = HAL.RTC_GetTime()

    at('if (log_due)')
    if (logDue) {
      at('      log_due = 0;')
      logDue = false
      if (haveReport) {
        at('history_log(&now);')
        await historyLog(now)
        at('] EEPROM: record #')
        HAL.UART_Transmit(
          `[${tick()} ms] EEPROM: record #${history[history.length - 1].seq} saved (${history.length}/${REC_COUNT})\r\n`,
        )
        at('HAL_UART_Transmit(&huart2, (uint8_t *)line, len', 3)
      }
      at('alarm_arm(&now);', 2)
      alarmArm(now)
      redraw = true
    }

    at('if (redraw || (screen == 0')
    if (redraw || (screen === 0 && now.sec !== shownSec)) {
      redraw = false
      shownSec = now.sec
      at('draw_screen(&now);')
      await drawScreen(now)
    }

    at('uint32_t spent = HAL_GetTick() - t0;')
    const spent = HAL.GetTick() - t0
    at('if (spent < SAMPLE_MS) HAL_Delay')
    if (spent < SAMPLE_MS) await HAL.Delay(SAMPLE_MS - spent)
  }
}
