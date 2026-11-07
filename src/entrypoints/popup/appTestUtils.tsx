import { act, fireEvent, render, screen } from '@testing-library/preact';
import { vi } from 'vitest';
import type { CareOutcome } from '@/core/types';
import { createEgg } from '@/core/factory';
import { EMPTY_KITCHEN } from '@/core/kitchen';
import { EMPTY_PROGRESS } from '@/core/progress';
import type { UseGame } from '@/ui/useGame';
import { App } from './App';

/**
 * Shared by the App.*.test.tsx files. Each test file registers its own vi.mock calls (they are
 * hoisted per file) and points them at the stand-ins below.
 */
export const i18nMock = {
  t: (k: string, subs?: string | string[]) => ((k.endsWith('_aria') || k === 'slot_filled') && subs !== undefined ? `${k}:${[subs].flat().join(',')}` : k),
};
export const assetsMock = {
  spriteUrl: (_f: string, pose: string) => `sprite-${pose}.png`,
  effectUrl: () => null,
  cookUrl: () => 'pot.png',
  backgroundUrl: (id: string) => backgroundUrl(id),
  iconUrl: () => null,
  decorUrl: () => null,
  accUrl: () => null,
  assetUrl: () => null,
  gameArtUrl: () => null,
  foodUrl: (food: string, bites: number) => `food-${food}-${bites}.png`,
};
export const backgroundUrl = vi.fn<(id: string) => string | null>(() => null);
export const useGame = vi.fn<() => UseGame>();
export const requestRoamAccess = vi.fn<() => Promise<boolean>>();
export const useGameMock = { useGame: () => useGame() };
export const roamPermissionMock = { requestRoamAccess: () => requestRoamAccess() };

export const pet = { ...createEgg(), stage: 'child' as const, formId: 'child_kemu' as const, poops: 2, sick: true };
export const fullSave = (petPatch: object = {}, extra: object = {}): NonNullable<UseGame['save']> => ({
  version: 1,
  game: { pet: { ...pet, ...petPatch }, generation: 1, lastTickAt: 0 },
  zukan: { discovered: ['egg', 'baby_puni'], memories: [] },
  kitchen: EMPTY_KITCHEN,
  progress: EMPTY_PROGRESS,
  home: { room: 'home', ownedDecor: [], ownedAcc: [], decor: {}, worn: {} },
  settings: { notifications: true, sound: true, sleepStartMin: 1320, sleepEndMin: 420, roam: false, roamHiddenSites: [] },
  meta: { lastNotified: {}, showRenewal: false, showDataReset: false },
  ...extra,
});
export const save = fullSave();
export const PET_LABEL = 'action_pet: form_child_kemu';
/** What `send` resolves to when a test does not care about the engine's answer. */
export const NOT_APPLIED = { ok: false, error: 'not applied in this test' } as const;

export function setup(outcome: CareOutcome | null = null, petPatch: object = {}, extra: object = {}) {
  const send = vi.fn().mockResolvedValue(NOT_APPLIED);
  const s = fullSave(petPatch, extra);
  useGame.mockReturnValue({ save: s, outcome, error: null, send });
  return { send, ui: render(<App />) };
}

/** Answers a care like the engine: ok with the given outcome and the save after it. */
export const answered = (outcome: CareOutcome, petPatch: object = {}) =>
  ({ ok: true, save: fullSave(petPatch), outcome }) as const;
export const flush = () => act(async () => void (await Promise.resolve()));
export const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
export const petSrc = (c: Element) => c.querySelector('img.pet__img')?.getAttribute('src') ?? '';

export async function feedRice(send: ReturnType<typeof vi.fn>) {
  send.mockResolvedValueOnce(answered({ action: 'feed', result: 'ok' }));
  fireEvent.click(screen.getByLabelText('action_feed'));
  fireEvent.click(screen.getByText('food_rice'));
  await flush();
}


export function stubAudio() {
  const freqs: number[] = [];
  class FakeAudioContext {
    currentTime = 0;
    state = 'running';
    destination = {};
    resume = vi.fn().mockResolvedValue(NOT_APPLIED);
    createGain() {
      return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() };
    }
    createOscillator() {
      const osc = {
        type: '',
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: {
          set value(v: number) {
            freqs.push(v);
          },
        },
      };
      return osc;
    }
  }
  vi.stubGlobal('AudioContext', FakeAudioContext);
  return freqs;
}

