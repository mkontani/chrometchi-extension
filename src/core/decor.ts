import { decorDef } from '@/data/decor';
import { ROOM_SLOTS, SLOT_IDS, SLOT_KIND } from '@/data/slots';
import { addCoins } from './progress';
import { roomRefusal } from './rooms';
import type {
  CareOutcome,
  DecorId,
  Home,
  PetState,
  Progress,
  RefuseReason,
  RewardId,
  RoomId,
  SlotId,
} from './types';

type Slots = Partial<Record<SlotId, DecorId>>;

const refused = (action: 'buy' | 'place', reason: RefuseReason): CareOutcome => ({
  action,
  result: 'refused',
  reason,
});

/** Buys a piece of furniture; refused (nothing changes) when owned already or the coins are short. */
export function buyDecor(input: {
  progress: Progress;
  home: Home;
  decor: DecorId;
}): { progress: Progress; home: Home; outcome: CareOutcome } {
  const { progress, home, decor } = input;
  const price = decorDef(decor).price;
  const reason: RefuseReason | null = home.ownedDecor.includes(decor)
    ? 'owned'
    : progress.coins < price
      ? 'noCoins'
      : null;
  if (reason) return { progress, home, outcome: refused('buy', reason) };
  return {
    progress: addCoins(progress, -price),
    home: { ...home, ownedDecor: [...home.ownedDecor, decor] },
    outcome: { action: 'buy', result: 'ok' },
  };
}

function placeRefusal(
  input: { pet: PetState; claimed: readonly RewardId[]; home: Home; room: RoomId; slot: SlotId; decor: DecorId | null },
): RefuseReason | null {
  const { pet, claimed, home, room, slot, decor } = input;
  const blocked = roomRefusal(pet, claimed, room);
  if (blocked) return blocked;
  if (!ROOM_SLOTS[room][slot]) return 'noSlot';
  if (decor === null) return null;
  if (!home.ownedDecor.includes(decor)) return 'notOwned';
  return decorDef(decor).slot === SLOT_KIND[slot] ? null : 'wrongSlot';
}

/** Puts an owned item in a slot (moving it if it is already in the room), or clears the slot with null. */
export function placeDecor(input: {
  pet: PetState;
  claimed: readonly RewardId[];
  home: Home;
  room: RoomId;
  slot: SlotId;
  decor: DecorId | null;
}): { home: Home; outcome: CareOutcome } {
  const { home, room, slot, decor } = input;
  const reason = placeRefusal(input);
  if (reason) return { home, outcome: refused('place', reason) };
  const kept = Object.entries(home.decor[room] ?? {}).filter(([s, d]) => s !== slot && d !== decor);
  const slots: Slots = Object.fromEntries(kept);
  const next: Slots = decor === null ? slots : { ...slots, [slot]: decor };
  return {
    home: { ...home, decor: { ...home.decor, [room]: next } },
    outcome: { action: 'place', result: 'ok' },
  };
}

/** The items placed in a room, in slot order, for the slots the room has. */
export function placedIn(home: Home, room: RoomId): readonly { slot: SlotId; decor: DecorId }[] {
  const slots = home.decor[room] ?? {};
  return SLOT_IDS.flatMap((slot) => {
    const decor = slots[slot];
    return decor && ROOM_SLOTS[room][slot] ? [{ slot, decor }] : [];
  });
}
