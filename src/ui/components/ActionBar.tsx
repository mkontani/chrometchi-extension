import type { PetState } from '@/core/types';
import { t } from '@/i18n/t';
import type { IconId } from '@/ui/assets';
import { IconButton } from './IconButton';

export type ActionKind = 'feed' | 'play' | 'outing' | 'clean' | 'medicine' | 'lights' | 'zukan' | 'shop' | 'settings' | 'decorate';

// null marks a slot left empty.
const SLOTS: readonly (ActionKind | null)[] = [
  'feed', 'play', 'outing', 'clean', 'decorate',
  'medicine', 'lights', 'zukan', 'shop', 'settings',
];

export function isActionDisabled(kind: ActionKind, pet: PetState): boolean {
  switch (kind) {
    case 'feed':
    case 'play':
    case 'outing':
    case 'decorate':
      return pet.asleep || pet.stage === 'egg';
    case 'clean':
      return pet.poops === 0;
    case 'medicine':
      return !pet.sick;
    default:
      return false;
  }
}

interface Props {
  pet: PetState;
  badge: boolean;
  onSelect(kind: ActionKind): void;
}

export function ActionBar({ pet, badge, onSelect }: Props) {
  return (
    <nav class="action-bar">
      {SLOTS.map((kind, i) =>
        kind === null ? (
          <div key={`slot-${i}`} class="action-bar__spacer" aria-hidden="true" />
        ) : (
          <IconButton
            key={kind}
            id={kind as IconId}
            label={t(`action_${kind}`)}
            disabled={isActionDisabled(kind, pet)}
            badge={kind === 'zukan' && badge}
            onClick={() => onSelect(kind)}
          />
        ),
      )}
    </nav>
  );
}
