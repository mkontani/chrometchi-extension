import { describe, expect, test } from 'vitest'
import { consumeElapsed, isSleepTime, minuteOfDay } from '@/core/clock'

describe('consumeElapsed', () => {
  test('consumes whole minutes and keeps the remainder', () =>
    expect(consumeElapsed(0, 150_000, 180_000)).toEqual({ minutes: 2, nextTickAt: 120_000 }))
  test('gap above max counts as zero', () =>
    expect(consumeElapsed(0, 180_001, 180_000)).toEqual({ minutes: 0, nextTickAt: 180_001 }))
  test('gap exactly at max is counted', () =>
    expect(consumeElapsed(0, 180_000, 180_000)).toEqual({ minutes: 3, nextTickAt: 180_000 }))
  test('clock moved backwards counts as zero', () =>
    expect(consumeElapsed(500_000, 100_000, 180_000)).toEqual({ minutes: 0, nextTickAt: 100_000 }))
})

describe('minuteOfDay', () => {
  test('returns local minute of day', () => {
    const d = new Date(2026, 0, 1, 13, 45)
    expect(minuteOfDay(d.getTime())).toBe(13 * 60 + 45)
  })
})

describe('isSleepTime', () => {
  test.each([
    [1320, 1320, 420, true], [1439, 1320, 420, true], [0, 1320, 420, true], [419, 1320, 420, true],
    [420, 1320, 420, false], [720, 1320, 420, false],
    [60, 60, 360, true], [360, 60, 360, false], [30, 60, 360, false],
    [500, 600, 600, false],
  ])('isSleepTime(%i, %i, %i) = %s', (m, s, e, want) => expect(isSleepTime(m, s, e)).toBe(want))
})
