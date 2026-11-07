import type { RewardId, RoomId } from '@/core/types';
import { ROOMS } from '@/data/rooms';
import { t } from '@/i18n/t';
import { backgroundUrl } from '@/ui/assets';
import { rewardReasonText } from './MissionList';

interface Props {
  owned: readonly RoomId[];
  current: RoomId;
  onPick(room: RoomId): void;
}

/** How a locked room is earned, as a short phrase. */
function unlockText(unlock: RewardId | null): string {
  if (unlock === null) return '';
  return unlock === 'ending:first' ? t('room_unlock_first') : rewardReasonText(unlock);
}

export function RoomPicker({ owned, current, onPick }: Props) {
  return (
    <ul class="rooms">
      {ROOMS.map((room) => {
        const open = owned.includes(room.id);
        const name = t(`room_${room.id}`);
        const how = open ? '' : unlockText(room.unlock);
        const url = backgroundUrl(`${room.id}_day`);
        return (
          <li key={room.id} class="rooms__cell">
            <button
              type="button"
              class="rooms__btn"
              aria-pressed={room.id === current}
              aria-label={open ? name : `${name}, ${t('room_locked')}, ${how}`}
              disabled={!open}
              onClick={() => onPick(room.id)}
            >
              {url ? (
                <img class={open ? 'rooms__pic' : 'rooms__pic rooms__pic--locked'} src={url} width={88} height={68} alt="" />
              ) : null}
              <span class="rooms__name">{name}</span>
              {open ? null : <small class="rooms__how">{t('room_locked')}<br />{how}</small>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
