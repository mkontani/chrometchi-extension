import { describe, expect, test } from 'vitest';
import { makePet } from './__fixtures__/pet';
import { matches } from './evolution';
import { evolutionEnv } from './home-env';
import type { Home } from './types';

const home: Home = {
  room: 'home',
  ownedDecor: ['lamp'],
  decor: { home: { floorL: 'lamp', wallL: 'clock' } },
  ownedAcc: ['necklace'],
  worn: { neck: 'necklace' },
};

describe('evolutionEnv', () => {
  test('evolution reads the home at the moment of evolution', () => {
    const env = evolutionEnv(home, []);
    const pet = { rng: () => 0.99, hour: 12, env };
    expect(matches({ wearing: 'necklace' }, makePet(), pet)).toBe(true);
    expect(env.decorIn('home')).toEqual(['clock', 'lamp']);
    expect(env.decorIn('beach')).toEqual([]);
    expect(env.worn).toEqual({ neck: 'necklace' });
  });
});
