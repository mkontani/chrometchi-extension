import { describe, expect, test } from 'vitest';
import { EMPTY_PROGRESS } from '@/core/progress';
import type { Progress } from '@/core/types';
import { createFreshSave } from '@/storage/repository';
import type { SaveV1 } from '@/storage/schema';
import { bookkeepProgress } from './progress';

const NOW = 1_000;

function saveWith(progress: Progress, discovered: string[] = []): SaveV1 {
  const fresh = createFreshSave(0);
  return { ...fresh, progress, zukan: { ...fresh.zukan, discovered } };
}

describe('bookkeepProgress', () => {
  test('a departure pays 100 and sets the dot', () => {
    const next = bookkeepProgress(saveWith(EMPTY_PROGRESS), {
      events: [{ type: 'departed' }],
      now: NOW,
    });
    expect(next.progress.coins).toBe(100);
    expect(next.progress.unseen).toBe(true);
    expect(next.progress.recent[0]).toMatchObject({
      reason: 'ending:departed',
      coins: 100,
    });
  });

  test('a counted mission that reaches its target is paid in the same call', () => {
    const base = {
      ...EMPTY_PROGRESS,
      counts: { ...EMPTY_PROGRESS.counts, clean: 9 },
    };
    const next = bookkeepProgress(saveWith(base), {
      events: [],
      mission: 'clean',
      now: NOW,
    });
    expect(next.progress.counts.clean).toBe(10);
    expect(next.progress.coins).toBe(30);
    expect(next.progress.claimed).toContain('mission:clean:1');
  });

  test('an old save gets its zukan rewards on the first tick, once', () => {
    const save = {
      ...saveWith(
        EMPTY_PROGRESS,
        Array.from({ length: 23 }, (_, i) => `f${i}`),
      ),
    };
    const withMemories: SaveV1 = {
      ...save,
      zukan: {
        ...save.zukan,
        memories: [{ ending: 'dead' }, { ending: 'departed' }] as never,
      },
    };
    const first = bookkeepProgress(withMemories, { events: [], now: NOW });
    expect(first.progress.coins).toBe(100);
    expect(first.progress.claimed).toContain('ending:first');
    expect(bookkeepProgress(first, { events: [], now: NOW + 1 })).toBe(first);
  });

  test('an old save with memories is given ending:first on its first tick', () => {
    const fresh = saveWith(EMPTY_PROGRESS);
    const save: SaveV1 = {
      ...fresh,
      zukan: { ...fresh.zukan, memories: [{ ending: 'dead' }] as never },
    };
    const first = bookkeepProgress(save, { events: [], now: NOW });
    expect(first.progress.claimed).toEqual(['ending:first']);
    expect(first.progress.coins).toBe(0);
    expect(first.progress.unseen).toBe(true);
    expect(bookkeepProgress(first, { events: [], now: NOW + 1 })).toBe(first);
  });

  test('a death pays 30 and nothing changed returns the same save', () => {
    const save = saveWith(EMPTY_PROGRESS);
    expect(bookkeepProgress(save, { events: [{ type: 'died' }], now: NOW }).progress.coins).toBe(30);
    expect(bookkeepProgress(save, { events: [], now: NOW })).toBe(save);
  });
});
