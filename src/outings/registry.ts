import type { OutingKind } from '@/core/types';
import { fishingGame } from './fishing/logic';
import { gatheringGame } from './gathering/logic';
import { huntingGame } from './hunting/logic';
import type { OutingGame } from './types';

/** Outing games are heterogeneous in state type; the host only touches them via this interface. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyOutingGame = OutingGame<any>;

export const OUTING_GAMES: Record<OutingKind, AnyOutingGame> = {
  fishing: fishingGame,
  hunting: huntingGame,
  gathering: gatheringGame,
};
