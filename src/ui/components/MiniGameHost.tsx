import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameId } from '@/core/types';
import { MINI_GAMES, type AnyMiniGame } from '@/games/registry';
import type { GameInput } from '@/games/types';
import { t } from '@/i18n/t';
import { LOGICAL_SIZE, useGameInput } from '@/ui/useGameInput';

const MAX_DT_MS = 100;
const RESULT_MS = 1500;

interface Props {
  game: GameId;
  onFinish(won: boolean): void;
  onCancel(): void;
  /** Called once when the win/lose result is shown (before the result delay). */
  onResult?(won: boolean): void;
}

/** Runs the RAF loop; returns a cleanup. `onOver` fires once when the game ends. */
function startLoop(
  def: AnyMiniGame,
  ctx: CanvasRenderingContext2D,
  take: () => GameInput,
  onOver: (won: boolean) => void,
): () => void {
  const rng = Math.random;
  let state = def.init(rng);
  let raf = 0;
  let last: number | null = null;
  const frame = (now: number) => {
    const dt = last === null ? 0 : Math.min(MAX_DT_MS, now - last);
    last = now;
    state = def.step(state, dt, take(), rng);
    def.render(ctx, state);
    if (def.isOver(state)) onOver(def.won(state));
    else raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

export function MiniGameHost({ game, onFinish, onCancel, onResult }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const resultRef = useRef(onResult);
  resultRef.current = onResult;
  const def = MINI_GAMES[game];
  const take = useGameInput(canvasRef, def.pickFromPointer);
  const takeRef = useRef(take);
  takeRef.current = take;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setReady(true);
    const stop = startLoop(def, ctx, () => takeRef.current(), (won) => {
      setResult(won);
      resultRef.current?.(won);
      timer = setTimeout(() => finishRef.current(won), RESULT_MS);
    });
    return () => {
      stop();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [def]);

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
