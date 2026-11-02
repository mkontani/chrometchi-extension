import { describe, expect, test } from 'vitest'
import { createRng } from '@/core/rng'

describe('createRng', () => {
  test('is deterministic per seed and in [0,1)', () => {
    const a = createRng(42)
    const b = createRng(42)
    const seqA = Array.from({ length: 100 }, () => a())
    const seqB = Array.from({ length: 100 }, () => b())
    expect(seqA).toEqual(seqB)
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  test('different seeds give different sequences', () => {
    expect(createRng(1)()).not.toBe(createRng(2)())
  })
})
