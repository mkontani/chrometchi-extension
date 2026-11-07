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

  test('the shown room is the chosen room when its reward is claimed', () => {
    const beach: Home = { ...home, room: 'beach', decor: { beach: { floorL: 'candle' } } };
    const env = evolutionEnv(beach, ['zukan:10']);
    expect(env.room).toBe('beach');
    expect(env.decorIn('beach')).toEqual(['candle']);
  });

  test('the shown room falls back to home when the room is not unlocked', () => {
    expect(evolutionEnv({ ...home, room: 'beach' }, []).room).toBe('home');
  });
});
