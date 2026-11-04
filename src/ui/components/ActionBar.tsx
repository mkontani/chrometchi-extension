import type { PetState } from '@/core/types';
import { t } from '@/i18n/t';
import type { IconId } from '@/ui/assets';
import { IconButton } from './IconButton';

export type ActionKind = 'feed' | 'play' | 'outing' | 'clean' | 'medicine' | 'lights' | 'zukan' | 'settings';

const KINDS: readonly ActionKind[] = [
  'feed', 'play', 'outing', 'clean', 'medicine', 'lights', 'zukan', 'settings',
];

export function isActionDisabled(kind: ActionKind, pet: PetState): boolean {
  switch (kind) {
    case 'feed':
    case 'play':
    case 'outing':
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
  onSelect(kind: ActionKind): void;
}

export function ActionBar({ pet, onSelect }: Props) {
  return (
    <nav class="action-bar">
      {KINDS.map((kind) => (
        <IconButton
          key={kind}
          id={kind as IconId}
          label={t(`action_${kind}`)}
          disabled={isActionDisabled(kind, pet)}
          onClick={() => onSelect(kind)}
        />
      ))}
    </nav>
  );
}
