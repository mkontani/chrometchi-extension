import type { DecorId, RoomId, SlotId } from '@/core/types';
import { ROOM_SLOTS, SLOT_IDS } from '@/data/slots';
import { t } from '@/i18n/t';

interface Props {
  room: RoomId;
  /** the item in each slot of the room */
  placed: Partial<Record<SlotId, DecorId>>;
  selected: SlotId;
  onSelect(slot: SlotId): void;
}

/** The slots a room has, in the usual order. */
export function roomSlotIds(room: RoomId): readonly SlotId[] {
  return SLOT_IDS.filter((slot) => ROOM_SLOTS[room][slot]);
}

/** One dashed button per slot of the room, laid over the stage at the slot's rectangle. */
export function DecorSlots({ room, placed, selected, onSelect }: Props) {
  return (
    <>
      {roomSlotIds(room).map((slot) => {
        const rect = ROOM_SLOTS[room][slot];
        const item = placed[slot];
        const name = t(`slot_${slot}`);
        if (!rect) return null;
        return (
          <button
            key={slot}
            type="button"
            class="slot"
            aria-pressed={slot === selected}
            aria-label={item ? `${name}: ${t(`decor_${item}`)}` : name}
            style={{ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px` }}
            onClick={() => onSelect(slot)}
          />
        );
      })}
    </>
  );
}
