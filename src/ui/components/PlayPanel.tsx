import type { GameId } from '@/core/types';
import { GAMES } from '@/data/games';
import { t } from '@/i18n/t';
import { iconUrl } from '@/ui/assets';
import { Panel } from './Panel';

interface Props {
  onPick(game: GameId): void;
  onClose(): void;
}

export function PlayPanel({ onPick, onClose }: Props) {
  return (
    <Panel title={t('panel_play_title')} onClose={onClose}>
      <div class="panel__grid panel__grid--play">
        {GAMES.map((g) => {
          const url = iconUrl(`game_${g}`);
          return (
            <button key={g} type="button" class="panel__item" onClick={() => onPick(g)}>
              {url ? <img src={url} width={32} height={32} alt="" /> : null}
              <span>{t(`game_${g}`)}</span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
