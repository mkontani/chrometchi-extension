import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { cuesBetween, effectDurationMs, effectFrame } from '@/ui/effects/timeline';
import type { CareEffect, EffectFrame } from '@/ui/effects/types';
import type { SfxName } from '@/ui/sound';

export const EFFECT_TICK_MS = 50;

export interface CareEffectPlayer {
  readonly frame: EffectFrame | null;
  /** Starts `effect` from the beginning, replacing any running one; null stops the running one. */
  play(effect: CareEffect | null): void;
}

interface Run {
  readonly effect: CareEffect;
  readonly reduced: boolean;
  readonly startedAt: number;
}

interface Options {
  reduced: boolean;
  onCue(sfx: SfxName): void;
}

/** Clocks one care effect at a time and fires its sound cues as their time comes. */
export function useCareEffect(options: Options): CareEffectPlayer {
  const [view, setView] = useState<{ run: Run; t: number } | null>(null);
  const opts = useRef(options);
  opts.current = options;
  const run = useRef<Run | null>(null);
  const lastCueMs = useRef(-1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);

  const stop = useCallback(() => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
    run.current = null;
  }, []);

  const tick = useCallback(() => {
    const current = run.current;
    if (!current) return;
    const t = Date.now() - current.startedAt;
    for (const sfx of cuesBetween(current.effect, current.reduced, lastCueMs.current, t)) opts.current.onCue(sfx);
    lastCueMs.current = t;
    if (t >= effectDurationMs(current.effect, current.reduced)) {
      stop();
      setView(null);
    } else {
      setView({ run: current, t });
    }
  }, [stop]);

  const play = useCallback(
    (effect: CareEffect | null) => {
      if (!mounted.current) return;
      stop();
      if (!effect) return setView(null);
      run.current = { effect, reduced: opts.current.reduced, startedAt: Date.now() };
      lastCueMs.current = -1;
      tick();
      timer.current = setInterval(tick, EFFECT_TICK_MS);
    },
    [stop, tick],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
    };
  }, [stop]);

  const frame = view ? effectFrame(view.run.effect, view.t, view.run.reduced) : null;
  return { frame, play };
}
