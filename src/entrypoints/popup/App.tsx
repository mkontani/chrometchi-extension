import { useState } from 'preact/hooks';
import type { CareAction, FoodId, GameId } from '@/core/types';
import { t } from '@/i18n/t';
import { ActionBar, type ActionKind } from '@/ui/components/ActionBar';
import { FoodPanel } from '@/ui/components/FoodPanel';
import { OutcomeToast } from '@/ui/components/OutcomeToast';
import { PetStage } from '@/ui/components/PetStage';
import { PlayPanel } from '@/ui/components/PlayPanel';
import { StatusBar } from '@/ui/components/StatusBar';
import { useGame } from '@/ui/useGame';
import { useReaction } from '@/ui/useReaction';

type Panel = 'feed' | 'play' | 'zukan' | 'settings';
const PANELS: readonly ActionKind[] = ['feed', 'play', 'zukan', 'settings'];

function ErrorNote({ error }: { error: string }) {
  return (
    <div class="error" role="alert">
      <p>{t('error_generic')}</p>
      <small>{error}</small>
    </div>
  );
}

export function App() {
  const { save, outcome, error, send } = useGame();
  const [panel, setPanel] = useState<Panel | null>(null);
  // The mini-game host arrives in a later task; the pick is stored for now.
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const { reaction, fromPlay } = useReaction(outcome);

  if (!save) {
    return (
      <main class="app">
        <p class="message">{t('loading')}</p>
        {error && <ErrorNote error={error} />}
      </main>
    );
  }

  const pet = save.game.pet;
  const care = (action: CareAction) => void send({ type: 'care', action });
  const onSelect = (kind: ActionKind) => {
    if (kind === 'clean' || kind === 'medicine') care({ kind });
    else if (kind === 'lights') care({ kind, on: !pet.lightsOn });
    else if (PANELS.includes(kind)) setPanel((cur) => (cur === kind ? null : (kind as Panel)));
  };
  const pickFood = (food: FoodId) => {
    care({ kind: 'feed', food });
    setPanel(null);
  };
  const pickGame = (game: GameId) => {
    setActiveGame(game);
    setPanel(null);
  };
  const close = () => setPanel(null);

  return (
    <main class="app" data-active-game={activeGame ?? undefined}>
      <StatusBar pet={pet} />
      <PetStage
        pet={pet}
        reaction={reaction}
        fromPlay={fromPlay}
        onPetClick={() => care({ kind: 'pet' })}
      />
      {panel === 'feed' && <FoodPanel onPick={pickFood} onClose={close} />}
      {panel === 'play' && <PlayPanel onPick={pickGame} onClose={close} />}
      <OutcomeToast outcome={outcome} />
      <ActionBar pet={pet} onSelect={onSelect} />
      {error && <ErrorNote error={error} />}
    </main>
  );
}
