import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { OutingKind } from '@/core/types';
import { OUTING_GAMES } from '@/outings/registry';
import type { OutingView } from '@/outings/types';
import { t } from '@/i18n/t';
import { startLoop, useLatest, usePlayerSprite } from '@/ui/gameLoop';
import { createOutingArt } from '@/ui/outingArt';
import { LOGICAL_SIZE, useGameInput } from '@/ui/useGameInput';

const RESULT_MS = 1500;
const HINT_MS = 2000;

interface Props {
  kind: OutingKind;
  /** The pet's own sprite, drawn as the player. */
  playerUrl?: string;
  onFinish(score: number): void;
  onCancel(): void;
  /** Called once when the result is shown (before the result delay). */
  onResult?(score: number): void;
}

export function OutingHost({ kind, playerUrl, onFinish, onCancel, onResult }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState(true);
  const finishRef = useLatest(onFinish);
  const resultRef = useLatest(onResult);
  const def = OUTING_GAMES[kind];
  const take = useGameInput(canvasRef, def.pickFromPointer);
  const takeRef = useLatest(take);
  const player = usePlayerSprite(playerUrl);
  const art = useMemo(createOutingArt, []);

  useEffect(() => {
    const timer = setTimeout(() => setHint(false), HINT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setReady(true);
    const view = (): OutingView => ({ player: player(), art });
    const stop = startLoop(def, ctx, () => takeRef.current(), view, (state) => {
      const score = def.score(state);
      setDone(true);
      resultRef.current?.(score);
      timer = setTimeout(() => finishRef.current(score), RESULT_MS);
    });
    return () => {
      stop();
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [def, player, art]);

  return (
    <div class="minigame" role="dialog" aria-modal="true" aria-label={t(`outing_${kind}`)}>
      <p class="minigame__hint">{hint ? t(`outing_hint_${kind}`) : "\u00a0"}</p>
      <div class="minigame__frame" data-ready={ready ? 'true' : undefined}>
        <canvas
          ref={canvasRef}
          class="minigame__canvas"
          width={LOGICAL_SIZE}
          height={LOGICAL_SIZE}
          style={{ width: '360px', height: '360px', imageRendering: 'pixelated' }}
        />
      </div>
      {done && <p class="minigame__result">{t('outing_done')}</p>}
      {!done && (
        <button type="button" class="minigame__quit" onClick={onCancel}>
          {t('game_quit')}
        </button>
      )}
    </div>
  );
}
