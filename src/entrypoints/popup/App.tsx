import { useCallback, useEffect, useState } from 'preact/hooks';
import type { CareAction, CareOutcome, FoodId, GameId } from '@/core/types';
import type { SaveV1 } from '@/storage/schema';
import { t } from '@/i18n/t';
import { spriteUrl } from '@/ui/assets';
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
import { requestRoamAccess } from '@/ui/roamPermission';
import { useSfx, type SfxName } from '@/ui/sound';
import { useGame, type UseGame } from '@/ui/useGame';
import { useReaction } from '@/ui/useReaction';
import { effectFor } from '@/ui/effects/effectFor';
import { useCareEffect } from '@/ui/useCareEffect';
import { useReducedMotion } from '@/ui/useReducedMotion';

/** The sound for an outcome; null for care whose effect plays its own sounds as it goes. */
function sfxFor(outcome: CareOutcome): SfxName | null {
  if (outcome.result === 'refused') return 'alert';
  switch (outcome.action) {
    case 'play':
    case 'pet':
      return 'happy';
    default:
      return null;
  }
}

type Panel = 'feed' | 'play' | 'zukan' | 'settings';
const PANELS: readonly ActionKind[] = ['feed', 'play', 'zukan', 'settings'];

/** Raw engine/Chrome errors are not localized, so the UI shows only a generic message. */
function ErrorNote({ error }: { error: string }) {
  useEffect(() => {
    console.warn('[chrometchi] request failed:', error);
  }, [error]);
  return (
    <div class="error" role="alert">
      <p>{t('error_generic')}</p>
    </div>
  );
}

interface MainProps {
  save: SaveV1;
  outcome: CareOutcome | null;
  error: string | null;
  send: UseGame['send'];
  panel: Panel | null;
  setPanel(next: Panel | null | ((cur: Panel | null) => Panel | null)): void;
  onPlay(game: GameId): void;
  playSfx(name: SfxName): void;
}

function MainScreen({ save, outcome, error, send, panel, setPanel, onPlay, playSfx }: MainProps) {
  const { reaction, fromPlay } = useReaction(outcome);
  const effects = useCareEffect({ reduced: useReducedMotion(), onCue: playSfx });
  const ackCritical = useCallback(() => void send({ type: 'ackCritical' }), [send]);
  const pet = save.game.pet;
  // An accepted care replays as an effect; a new one replaces the running one, a refusal leaves it be.
  const care = (action: CareAction) => {
    const before = pet;
    void send({ type: 'care', action }).then((r) => {
      if (r.ok && r.outcome?.result === 'ok') effects.play(effectFor(action, before, r.save.game.pet));
    });
  };
  const onSelect = (kind: ActionKind) => {
    if (kind === 'clean' || kind === 'medicine') care({ kind });
    else if (kind === 'lights') care({ kind, on: !pet.lightsOn });
    else if (PANELS.includes(kind)) setPanel((cur) => (cur === kind ? null : (kind as Panel)));
  };
  const pickFood = (food: FoodId) => {
    care({ kind: 'feed', food });
    setPanel(null);
  };
  const close = () => setPanel(null);
  const choice =
    panel === 'feed' ? <FoodPanel onPick={pickFood} onClose={close} />
    : panel === 'play' ? <PlayPanel onPick={onPlay} onClose={close} />
    : null;
  return (
    <>
      <StatusBar pet={pet} />
      {/* The banner and panels overlay the stage so its size never changes. */}
      <div class="stage-area">
        <PetStage
          pet={pet}
          generation={save.game.generation}
          reaction={reaction}
          fromPlay={fromPlay}
          effect={effects.frame}
          onPetClick={() => care({ kind: 'pet' })}
        />
        <div class="stage-area__overlay stage-area__overlay--top">
          <CriticalBanner pet={pet} onAck={ackCritical} />
        </div>
        {choice && <div class="stage-area__overlay stage-area__overlay--bottom">{choice}</div>}
      </div>
      <OutcomeToast outcome={outcome} />
      <ActionBar pet={pet} onSelect={onSelect} />
      {error && <ErrorNote error={error} />}
    </>
  );
}

/** Roaming needs site access first; if the popup closes during Chrome's prompt, the background
 * notices the grant (permissions.onAdded) and turns roaming on by itself. */
async function toggleRoam(next: boolean, send: UseGame['send']): Promise<void> {
  if (next && !(await requestRoamAccess(browser.permissions))) return;
  await send({ type: 'updateSettings', patch: { roam: next } });
}

function InfoOverlay(props: { kind: 'zukan' | 'settings'; save: SaveV1; send: UseGame['send']; onClose(): void }) {
  const { kind, save, send, onClose } = props;
  if (kind === 'zukan') {
    return (
      <Overlay title={t('zukan_title')} onClose={onClose}>
        <ZukanView zukan={save.zukan} />
      </Overlay>
    );
  }
  return (
    <Overlay title={t('settings_title')} onClose={onClose}>
      <SettingsView
        settings={save.settings}
        onChange={(patch) => void send({ type: 'updateSettings', patch })}
        onRoamToggle={(next) => void toggleRoam(next, send)}
        onRestart={() => {
          void send({ type: 'restart' });
          onClose();
        }}
      />
    </Overlay>
  );
}

export function App() {
  const { save, outcome, error, send } = useGame();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const alive = save?.game.pet.lifecycle === 'alive';
  const sfx = useSfx(save?.settings.sound ?? false);

  useEffect(() => {
    const name = outcome && sfxFor(outcome);
    if (name) sfx.play(name);
  }, [outcome, sfx]);

  useEffect(() => {
    if (save && !alive) {
      setActiveGame(null);
      setPanel(null);
    }
  }, [save, alive]);

  if (!save) {
    return (
      <main class="app">
        <p class="message">{t('loading')}</p>
        {error && <ErrorNote error={error} />}
      </main>
    );
  }

  const pet = save.game.pet;
  const close = () => setPanel(null);
  const endGame = () => setActiveGame(null);
  const onPlay = (game: GameId) => {
    setActiveGame(game);
    setPanel(null);
  };
  const onFinish = (won: boolean) => {
    if (activeGame) void send({ type: 'care', action: { kind: 'play', game: activeGame, won } });
    endGame();
  };

  // Exactly one layer is mounted at a time, by priority.
  let layer;
  if (save.meta.showRenewal || save.meta.showDataReset) {
    layer = (
      <NoticeDialog
        meta={save.meta}
        onDismiss={(notice) => void send({ type: 'dismissNotice', notice })}
      />
    );
  } else if (!alive) {
    layer = <EndingView pet={pet} onNewEgg={() => void send({ type: 'startNewEgg' })} />;
  } else if (activeGame) {
    layer = (
      <MiniGameHost
        game={activeGame}
        playerUrl={spriteUrl(pet.formId, 'idle0', save.game.generation)}
        onFinish={onFinish}
        onCancel={endGame}
        onResult={(won) => sfx.play(won ? 'win' : 'lose')}
      />
    );
  } else if (panel === 'zukan' || panel === 'settings') {
    layer = <InfoOverlay kind={panel} save={save} send={send} onClose={close} />;
  } else {
    layer = (
      <MainScreen
        save={save}
        outcome={outcome}
        error={error}
        send={send}
        panel={panel}
        setPanel={setPanel}
        onPlay={onPlay}
        playSfx={sfx.play}
      />
    );
  }
  return <main class="app">{layer}</main>;
}
