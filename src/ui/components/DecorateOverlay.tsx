import { useState } from 'preact/hooks';
import { placedIn } from '@/core/decor';
import { ownedRooms, shownRoom } from '@/core/rooms';
import type { AccessoryId, CareOutcome, DecorId, SlotId, WearPlace } from '@/core/types';
import { SLOT_KIND } from '@/data/slots';
import type { SaveV1 } from '@/storage/schema';
import { t } from '@/i18n/t';
import type { UseGame } from '@/ui/useGame';
import { DecorPicker } from './DecorPicker';
import { DecorSlots, roomSlotIds } from './DecorSlots';
import { DressPicker } from './DressPicker';
import { OutcomeToast } from './OutcomeToast';
import { Overlay } from './Overlay';
import { PetStage } from './PetStage';
import { RoomPicker } from './RoomPicker';
import { TabBar, type TabDef } from './TabBar';
import { WearPlaces } from './WearPlaces';

const SHOWN: ReadonlySet<string> = new Set(['setRoom', 'place', 'wear']);

type Tab = 'room' | 'decor' | 'dress';

interface Props {
  save: SaveV1;
  outcome: CareOutcome | null;
  send: UseGame['send'];
  onClose(): void;
}

/** The live stage with, below it, the room list or the furniture picker; the stage never shrinks. */
export function DecorateOverlay({ save, outcome, send, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('room');
  const [wearPlace, setWearPlace] = useState<WearPlace>('head');
  const [chosen, setChosen] = useState<SlotId | null>(null);
  const { claimed } = save.progress;
  const room = shownRoom(save.home.room, claimed);
  const slots = roomSlotIds(room);
  // A slot the shown room does not have (after a room switch) falls back to the first one.
  const slot: SlotId = chosen && slots.includes(chosen) ? chosen : (slots[0] ?? 'rug');
  const placed = save.home.decor[room] ?? {};
  const tabs: readonly TabDef<Tab>[] = [
    { id: 'room', label: t('decorate_tab_room') },
    { id: 'decor', label: t('decorate_tab_decor') },
    { id: 'dress', label: t('decorate_tab_dress') },
  ];
  const place = (decor: DecorId | null) => void send({ type: 'placeDecor', room, slot, decor });
  const wear = (acc: AccessoryId | null) => void send({ type: 'wear', place: wearPlace, acc });
  return (
    <Overlay title={t('decorate_title')} onClose={onClose} headerExtra={<TabBar<Tab> tabs={tabs} active={tab} onTab={setTab} label={t('decorate_title')} />}>
      <div class="decorate">
        <PetStage
          pet={save.game.pet}
          generation={save.game.generation}
          room={room}
          decor={placedIn(save.home, room)}
          worn={save.home.worn}
          reaction={null}
        >
          {tab === 'decor' && <DecorSlots room={room} placed={placed} selected={slot} onSelect={setChosen} />}
        </PetStage>
        {tab === 'room' && (
          <RoomPicker
            owned={ownedRooms(claimed)}
            current={room}
            onPick={(next) => void send({ type: 'setRoom', room: next })}
          />
        )}
        {tab === 'decor' && (
          <DecorPicker
            owned={save.home.ownedDecor}
            slotKind={SLOT_KIND[slot]}
            placed={placed[slot] ?? null}
            onPlace={place}
          />
        )}
        {tab === 'dress' && (
          <>
            <WearPlaces worn={save.home.worn} selected={wearPlace} onSelect={setWearPlace} />
            <DressPicker owned={save.home.ownedAcc} place={wearPlace} worn={save.home.worn} onWear={wear} />
          </>
        )}
      </div>
      <OutcomeToast outcome={SHOWN.has(outcome?.action ?? '') ? outcome : null} />
    </Overlay>
  );
}
