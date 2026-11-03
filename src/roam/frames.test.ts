import { describe, expect, test } from 'vitest';
import { makePet } from '@/core/__fixtures__/pet';
import { roamFramePaths } from './frames';

/** A fake asset table: every listed path resolves to "/<path>.png". */
const table = (paths: string[]) => (path: string) => (paths.includes(path) ? `/${path}.png` : null);
const walk = (dir: string) => Array.from({ length: 8 }, (_, i) => `sprites/${dir}/walk${i}`);

describe('roamFramePaths', () => {
  test('a walking pet gets its 8 walk frames and 2 rest frames', () => {
    const lookup = table(['sprites/adult_dragon/idle0', 'sprites/adult_dragon/idle1', 'sprites/adult_dragon/sleep',
      'sprites/adult_dragon/happy', ...walk('adult_dragon')]);
    const frames = roamFramePaths(makePet({ formId: 'adult_dragon', stage: 'adult' }), 1, lookup);
    expect(frames.walk).toEqual(walk('adult_dragon').map((p) => `/${p}.png`));
    expect(frames.rest).toEqual(['/sprites/adult_dragon/idle0.png', '/sprites/adult_dragon/idle1.png']);
    expect(frames.sleep).toBe('/sprites/adult_dragon/sleep.png');
    expect(frames.happy).toBe('/sprites/adult_dragon/happy.png');
  });

  test('a form without a full walk cycle walks with its idle frames', () => {
    const lookup = table(['sprites/baby_puni/idle0', 'sprites/baby_puni/idle1', 'sprites/baby_puni/walk0']);
    const frames = roamFramePaths(makePet(), 1, lookup);
    expect(frames.walk).toEqual(frames.rest);
    expect(frames.sleep).toBe('/sprites/baby_puni/idle0.png');
  });

  test('eggs walk with their wobble frames for their generation', () => {
    const lookup = table(['sprites/egg/dots/idle0', 'sprites/egg/dots/idle1']);
    const frames = roamFramePaths(makePet({ formId: 'egg', stage: 'egg' }), 2, lookup);
    expect(frames.rest).toEqual(['/sprites/egg/dots/idle0.png', '/sprites/egg/dots/idle1.png']);
    expect(frames.walk).toEqual(frames.rest);
  });

  test('the real asset table resolves every frame', () => {
    const frames = roamFramePaths(makePet({ formId: 'adult_dragon', stage: 'adult' }), 1);
    for (const url of [...frames.walk, ...frames.rest, frames.sleep, frames.happy]) expect(url).toBeTruthy();
  });
});
