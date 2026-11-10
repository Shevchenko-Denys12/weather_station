/**
 * Which net every module pin belongs to once it is wired (C/README.md).
 * Keys are module-scoped nets ("GROUP:PIN" or "GROUP:pairName"); values are
 * Nucleo nets (MCU pin name, '+3V3', 'GND'). Anything not listed stays
 * scoped to its module, i.e. not connected (e.g. HW-084 32K, DHT11 NC).
 *
 * No imports here on purpose: pinout.js reads this while building PINS.
 */
export const MODULE_NETS = {
  // OLED JMD0.96D-1 (SSD1306, 0x3C)
  'OLED:GND': 'GND',
  'OLED:VCC': '+3V3',
  'OLED:SCL': 'PB8',
  'OLED:SDA': 'PB9',

  // HW-084: DS3231 0x68 + AT24C32 0x57, powered from 3.3 V only
  'HW084:VCC': '+3V3',
  'HW084:GND': 'GND',
  'HW084:SCL': 'PB8',
  'HW084:SDA': 'PB9',
  'HW084:SQW': 'PB5', // alarm → D4, EXTI5 (scheme В)

  // GY-BMP280-3.3: I²C (CSB high), address 0x76 (SDO low)
  'BMP280:VCC': '+3V3',
  'BMP280:GND': 'GND',
  'BMP280:SCL': 'PB8',
  'BMP280:SDA': 'PB9',
  'BMP280:CSB': '+3V3',
  'BMP280:SDO': 'GND',

  // DHT11 module (+ − OUT, pull-up on board): OUT → D6 (PB10) (scheme А)
  'DHT11:+': '+3V3',
  'DHT11:-': 'GND',
  'DHT11:OUT': 'PB10',

  // SW1: pin 1 (pair A) → D2 (PA10, EXTI10, pull-up), pin 4 (pair B) → GND (scheme Б)
  'SW1:A': 'PA10',
  'SW1:B': 'GND',
}
