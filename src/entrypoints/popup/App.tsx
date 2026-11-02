import { useCallback, useState } from 'preact/hooks';
import type { CareAction, FoodId, GameId } from '@/core/types';
import { t } from '@/i18n/t';
import { ActionBar, type ActionKind } from '@/ui/components/ActionBar';
import { CriticalBanner } from '@/ui/components/CriticalBanner';
import { EndingView } from '@/ui/components/EndingView';
import { FoodPanel } from '@/ui/components/FoodPanel';
import { MiniGameHost } from '@/ui/components/MiniGameHost';
import { NoticeDialog } from '@/ui/components/NoticeDialog';
import { OutcomeToast } from '@/ui/components/OutcomeToast';
import { Overlay } from '@/ui/components/Overlay';
import { PetStage } from '@/ui/components/PetStage';
import { PlayPanel } from '@/ui/components/PlayPanel';
import { SettingsView } from '@/ui/components/SettingsView';
import { StatusBar } from '@/ui/components/StatusBar';
import { ZukanView } from '@/ui/components/ZukanView';
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
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const { reaction, fromPlay } = useReaction(outcome);
  const ackCritical = useCallback(() => void send({ type: 'ackCritical' }), [send]);

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
    <main class="app">
      <StatusBar pet={pet} />
      <CriticalBanner pet={pet} onAck={ackCritical} />
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
      {panel === 'zukan' && (
        <Overlay title={t('zukan_title')} onClose={close}>
          <ZukanView zukan={save.zukan} />
        </Overlay>
      )}
      {panel === 'settings' && (
        <Overlay title={t('settings_title')} onClose={close}>
          <SettingsView
            settings={save.settings}
            onChange={(patch) => void send({ type: 'updateSettings', patch })}
            onRestart={() => {
              void send({ type: 'restart' });
              close();
            }}
          />
        </Overlay>
      )}
      {activeGame && (
        <MiniGameHost
          game={activeGame}
          onFinish={(won) => {
            care({ kind: 'play', game: activeGame, won });
            setActiveGame(null);
          }}
          onCancel={() => setActiveGame(null)}
        />
      )}
      {pet.lifecycle !== 'alive' && (
        <EndingView pet={pet} onNewEgg={() => void send({ type: 'startNewEgg' })} />
      )}
      <NoticeDialog
        meta={save.meta}
        onDismiss={(notice) => void send({ type: 'dismissNotice', notice })}
      />
    </main>
  );
}
