import { useState } from 'preact/hooks';
import { t } from '@/i18n/t';
import { ActionBar, type ActionKind } from '@/ui/components/ActionBar';
import { PetStage } from '@/ui/components/PetStage';
import { StatusBar } from '@/ui/components/StatusBar';
import { useGame } from '@/ui/useGame';

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
  const { save, error, send } = useGame();
  // Panels are rendered by later tasks; selection is stored for now.
  const [, setPanel] = useState<Panel | null>(null);

  if (!save) {
    return (
      <main class="app">
        <p class="message">{t('loading')}</p>
        {error && <ErrorNote error={error} />}
      </main>
    );
  }

  const pet = save.game.pet;
  const onSelect = (kind: ActionKind) => {
    if (kind === 'clean' || kind === 'medicine') {
      void send({ type: 'care', action: { kind } });
    } else if (PANELS.includes(kind)) {
      setPanel(kind as Panel);
    }
  };

  return (
    <main class="app">
      <StatusBar pet={pet} />
      <PetStage pet={pet} reaction={null} />
      <ActionBar pet={pet} onSelect={onSelect} />
      {error && <ErrorNote error={error} />}
    </main>
  );
}
