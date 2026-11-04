import { useCallback, useRef, useState } from 'preact/hooks';
import type { FarmOp } from '@/core/farm';
import type { Gained, OutingKind } from '@/core/types';
import type { EngineResponse } from '@/messaging/protocol';
import type { UseGame } from '@/ui/useGame';

export interface UseOutings {
  active: OutingKind | null;
  start(kind: OutingKind): void;
  finish(score: number): void;
  cancel(): void;
  farm(action: FarmOp): void;
  gained: Gained | null;
  clearGained(): void;
}

/** The items of an ok reply, or null when refused, failed or empty. */
function gainedOf(r: EngineResponse): Gained | null {
  return r.ok && r.gained && Object.keys(r.gained).length > 0 ? r.gained : null;
}

export function useOutings(send: UseGame['send']): UseOutings {
  const [active, setActive] = useState<OutingKind | null>(null);
  const [gained, setGained] = useState<Gained | null>(null);
  // A request in flight: further taps are ignored until its reply arrives.
  const forageBusy = useRef(false);
  const farmBusy = useRef(false);

  /** Shows a new haul; a reply with nothing to show (refused, failed, empty) keeps the note already showing. */
  const showHaul = (r: EngineResponse): void => {
    const next = gainedOf(r);
    if (next) setGained(next);
  };

  const finish = useCallback(
    async (score: number) => {
      if (active === null || forageBusy.current) return;
      forageBusy.current = true;
      setActive(null);
      try {
        showHaul(await send({ type: 'forage', kind: active, score }));
      } finally {
        forageBusy.current = false;
      }
    },
    [active, send],
  );
  const farm = useCallback(
    async (action: FarmOp) => {
      if (farmBusy.current) return;
      farmBusy.current = true;
      try {
        showHaul(await send({ type: 'farm', action }));
      } finally {
        farmBusy.current = false;
      }
    },
    [send],
  );
  const cancel = useCallback(() => setActive(null), []);
  const clearGained = useCallback(() => setGained(null), []);
  return { active, start: setActive, finish, cancel, farm, gained, clearGained };
}
