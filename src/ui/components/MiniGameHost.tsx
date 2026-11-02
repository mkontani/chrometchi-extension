import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameId } from '@/core/types';
import { MINI_GAMES } from '@/games/registry';
import { NO_INPUT, type GameInput } from '@/games/types';
import { t } from '@/i18n/t';

const LOGICAL = 180;
const MAX_DT_MS = 100;
const RESULT_MS = 1500;

interface Props {
  game: GameId;
  onFinish(won: boolean): void;
  onCancel(): void;
}

interface Pending {
  left: boolean;
  right: boolean;
  action: boolean;
  pick: number | null;
}

const KEYS: Readonly<Record<string, 'left' | 'right' | 'action'>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ' ': 'action',
  Space: 'action',
};

export function MiniGameHost({ game, onFinish, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pending = useRef<Pending>({ ...NO_INPUT });
  const [result, setResult] = useState<boolean | null>(null);
  const cbs = useRef({ onFinish });
  cbs.current = { onFinish };

  useEffect(() => {
    const def = MINI_GAMES[game];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!def || !canvas || !ctx) return;
    const rng = Math.random;
    let state = def.init(rng);
    let raf = 0;
    let last: number | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onKey = (e: KeyboardEvent) => {
      const k = KEYS[e.key] ?? KEYS[e.code];
      if (!k) return;
      e.preventDefault();
      pending.current = { ...pending.current, [k]: true };
    };
    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = ((e.clientX - r.left) / r.width) * LOGICAL;
      const y = ((e.clientY - r.top) / r.height) * LOGICAL;
      const pick = def.pickFromPointer?.(x, y) ?? null;
      if (pick !== null) pending.current = { ...pending.current, pick };
    };

    const frame = (now: number) => {
      const dt = last === null ? 0 : Math.min(MAX_DT_MS, now - last);
      last = now;
      const input: GameInput = pending.current;
      pending.current = { ...NO_INPUT };
      state = def.step(state, dt, input, rng);
      def.render(ctx, state);
      if (def.isOver(state)) {
        const won = def.won(state);
        setResult(won);
        timer = setTimeout(() => cbs.current.onFinish(won), RESULT_MS);
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    window.addEventListener('keydown', onKey);
    canvas.addEventListener('pointerdown', onPointer);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onPointer);
    };
  }, [game]);

  return (
    <div class="minigame" role="dialog">
      <p class="minigame__hint">{t(`game_hint_${game}`)}</p>
      <canvas
        ref={canvasRef}
        class="minigame__canvas"
        width={LOGICAL}
        height={LOGICAL}
        style={{ width: '360px', height: '360px', imageRendering: 'pixelated' }}
      />
      {result !== null && <p class="minigame__result">{t(result ? 'game_win' : 'game_lose')}</p>}
      <button type="button" class="minigame__quit" onClick={onCancel}>
        {t('game_quit')}
      </button>
    </div>
  );
}
