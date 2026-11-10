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

export const FILE_NAME = 'Core/Src/main.c'

export const SOURCE = `/**
 * main.c — NUCLEO-F411RE · External LED demo
 *
 * Breadboard circuit:
 *   D7 (PA8) ── R1 220 Ω ── LED1 (red) ── GND
 *   I = (3.3 V − 2.0 V) / 220 Ω ≈ 6 mA
 *
 * LED1 flashes for 300 ms every 3 s, each flash is logged
 * to USART2 (ST-LINK virtual COM port, 115200 8N1).
 * Press B1 (PC13) to switch the period 3 s ↔ 1 s.
 */
#include "main.h"
#include <stdio.h>
#include <string.h>

#define LED_EXT_Pin        GPIO_PIN_8   /* PA8 = Arduino D7 */
#define LED_EXT_GPIO_Port  GPIOA
#define FLASH_MS           300

UART_HandleTypeDef huart2;
static volatile uint32_t period_ms = 3000;

void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_USART2_UART_Init(void);

int main(void)
{
  HAL_Init();
  SystemClock_Config();
  MX_GPIO_Init();
  MX_USART2_UART_Init();

  char msg[48];
  uint32_t flashes = 0;

  const char *hello = "LED1 on D7 (PA8) via 220R, ready\\r\\n";
  HAL_UART_Transmit(&huart2, (uint8_t *)hello, strlen(hello), HAL_MAX_DELAY);

  while (1)
  {
    /* LED on */
    HAL_GPIO_WritePin(LED_EXT_GPIO_Port, LED_EXT_Pin, GPIO_PIN_SET);

    int len = snprintf(msg, sizeof(msg), "[%6lu ms] flash #%lu\\r\\n",
                       HAL_GetTick(), ++flashes);
    HAL_UART_Transmit(&huart2, (uint8_t *)msg, len, HAL_MAX_DELAY);
    HAL_Delay(FLASH_MS);

    /* LED off for the rest of the period */
    HAL_GPIO_WritePin(LED_EXT_GPIO_Port, LED_EXT_Pin, GPIO_PIN_RESET);
    HAL_Delay(period_ms - FLASH_MS);
  }
}

/* EXTI15_10 IRQ → B1 user button, falling edge */
void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin)
{
  if (GPIO_Pin == B1_Pin)
  {
    period_ms = (period_ms == 3000) ? 1000 : 3000;
  }
}

static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};
  __HAL_RCC_GPIOA_CLK_ENABLE();
  __HAL_RCC_GPIOC_CLK_ENABLE();

  /* LED1 — PA8 (D7), push-pull output, starts low */
  GPIO_InitStruct.Pin   = LED_EXT_Pin;
  GPIO_InitStruct.Mode  = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull  = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(LED_EXT_GPIO_Port, &GPIO_InitStruct);

  /* B1 — PC13, external interrupt on falling edge */
  GPIO_InitStruct.Pin  = B1_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_IT_FALLING;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  HAL_GPIO_Init(B1_GPIO_Port, &GPIO_InitStruct);

  HAL_NVIC_SetPriority(EXTI15_10_IRQn, 0, 0);
  HAL_NVIC_EnableIRQ(EXTI15_10_IRQn);
}

/* SystemClock_Config() and MX_USART2_UART_Init() are generated
 * by STM32CubeMX and omitted here for brevity. */
`

export const SOURCE_LINES = SOURCE.split('\n')

/** 1-based line number of the first source line containing `snippet`. */
export function lineOf(snippet) {
  const idx = SOURCE_LINES.findIndex((l) => l.includes(snippet))
  if (idx === -1) throw new Error(`firmware: snippet not found: ${snippet}`)
  return idx + 1
}

// Pin aliases (main.h / #defines above → port+pin)
const LED_EXT_Pin = 'PA8' // D7, breadboard LED1
const B1_Pin = 'PC13'
const FLASH_MS = 300

/**
 * JS twin of main(). `HAL` is the mock from hal.js, `at` highlights a line.
 */
export async function main({ HAL, at, signal }) {
  let periodMs = 3000

  // Interrupt handler — registered with the mock NVIC
  const HAL_GPIO_EXTI_Callback = (pin) => {
    at('void HAL_GPIO_EXTI_Callback')
    if (pin === B1_Pin) {
      periodMs = periodMs === 3000 ? 1000 : 3000
      HAL.debug(`EXTI13 → period_ms = ${periodMs}`)
    }
  }

  at('HAL_Init();')
  HAL.Init()
  at('SystemClock_Config();')
  await HAL.step()
  at('MX_GPIO_Init();')
  HAL.GPIO_Init(LED_EXT_Pin, 'OUTPUT_PP')
  HAL.GPIO_Init(B1_Pin, 'IT_FALLING', HAL_GPIO_EXTI_Callback)
  await HAL.step()
  at('MX_USART2_UART_Init();')
  HAL.UART_Init(115200)
  await HAL.step()

  let flashes = 0
  at('HAL_UART_Transmit(&huart2, (uint8_t *)hello')
  HAL.UART_Transmit('LED1 on D7 (PA8) via 220R, ready\r\n')

  while (true) {
    signal.throwIfAborted()

    at('GPIO_PIN_SET);')
    HAL.GPIO_WritePin(LED_EXT_Pin, 1)

    at('int len = snprintf')
    const msg = `[${String(HAL.GetTick()).padStart(6)} ms] flash #${++flashes}\r\n`
    at('HAL_UART_Transmit(&huart2, (uint8_t *)msg')
    HAL.UART_Transmit(msg)
    at('HAL_Delay(FLASH_MS);')
    await HAL.Delay(FLASH_MS)

    at('GPIO_PIN_RESET);')
    HAL.GPIO_WritePin(LED_EXT_Pin, 0)
    at('HAL_Delay(period_ms - FLASH_MS);')
    await HAL.Delay(periodMs - FLASH_MS)
  }
}
