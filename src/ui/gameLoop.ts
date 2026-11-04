import { useCallback, useMemo, useRef } from 'preact/hooks';
import { loadSprite } from '@/games/sprites';
import type { GameInput } from '@/games/types';
import type { Rng } from '@/core/types';

const MAX_DT_MS = 100;

/** What the loop needs from a game, whatever its state and view types are. */
export interface LoopDef<S, V> {
  init(rng: Rng): S;
  step(s: S, dtMs: number, input: GameInput, rng: Rng): S;
  isOver(s: S): boolean;
  render(ctx: CanvasRenderingContext2D, s: S, view: V): void;
}

/** Runs the RAF loop; returns a cleanup. `onOver` fires once, with the final state, when the game ends. */
export function startLoop<S, V>(
  def: LoopDef<S, V>,
  ctx: CanvasRenderingContext2D,
  take: () => GameInput,
  view: () => V,
  onOver: (state: S) => void,
): () => void {
  const rng = Math.random;
  let state = def.init(rng);
  let raf = 0;
  let last: number | null = null;
  const frame = (now: number) => {
    const dt = last === null ? 0 : Math.min(MAX_DT_MS, now - last);
    last = now;
    state = def.step(state, dt, take(), rng);
    def.render(ctx, state, view());
    if (def.isOver(state)) onOver(state);
    else raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

/** A ref that always holds the latest value, for callbacks read inside the RAF loop. */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/** Starts loading the pet sprite once per URL; the returned getter is stable and cheap per frame. */
export function usePlayerSprite(url: string | undefined): () => CanvasImageSource | null {
  const latest = useLatest(useMemo(() => loadSprite(url ?? null), [url]));
  return useCallback(() => latest.current(), [latest]);
}
