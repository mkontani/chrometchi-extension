import { gameArtUrl } from '@/ui/assets';
import { createSpriteCache, type SpriteCache } from './sprites';

/** One cache for every mini-game, so shared art (the treat) loads once. */
export const gameArt: SpriteCache = createSpriteCache(gameArtUrl);
