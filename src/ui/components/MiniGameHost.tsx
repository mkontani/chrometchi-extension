import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameId } from '@/core/types';
import { MINI_GAMES } from '@/games/registry';
import type { GameView } from '@/games/types';
import { t } from '@/i18n/t';
import { startLoop, useLatest, usePlayerSprite } from '@/ui/gameLoop';
import { LOGICAL_SIZE, useGameInput } from '@/ui/useGameInput';

const RESULT_MS = 1500;

interface Props {
  game: GameId;
  /** The pet's own sprite, drawn as the player where a game has one. */
  playerUrl?: string;
  onFinish(won: boolean): void;
  onCancel(): void;
  /** Called once when the win/lose result is shown (before the result delay). */
  onResult?(won: boolean): void;
}

export function MiniGameHost({ game, playerUrl, onFinish, onCancel, onResult }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const finishRef = useLatest(onFinish);
  const resultRef = useLatest(onResult);
  const def = MINI_GAMES[game];
  const take = useGameInput(canvasRef, def.pickFromPointer);
  const takeRef = useLatest(take);
  const player = usePlayerSprite(playerUrl);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setReady(true);
    const view = (): GameView => ({ player: player() });
    const stop = startLoop(def, ctx, () => takeRef.current(), view, (state) => {
      const won = def.won(state);
      setResult(won);
      resultRef.current?.(won);
      timer = setTimeout(() => finishRef.current(won), RESULT_MS);
    });
    return () => {
      stop();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [def, player]);

  return (
    <div class="minigame" role="dialog" aria-modal="true" aria-label={t(`game_${game}`)}>
      <p class="minigame__hint">{t(`game_hint_${game}`)}</p>
      <div class="minigame__frame" data-ready={ready ? 'true' : undefined}>
        <canvas
          ref={canvasRef}
          class="minigame__canvas"
          width={LOGICAL_SIZE}
          height={LOGICAL_SIZE}
          style={{ width: '360px', height: '360px', imageRendering: 'pixelated' }}
        />
      </div>
      {result !== null && <p class="minigame__result">{t(result ? 'game_win' : 'game_lose')}</p>}
      {result === null && (
        <button type="button" class="minigame__quit" onClick={onCancel}>
          {t('game_quit')}
        </button>
      )}
    </div>
  );
}
