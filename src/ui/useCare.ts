import { useRef, useState } from 'preact/hooks';
import type { CareAction, PetState } from '@/core/types';
import type { EngineRequest, EngineResponse } from '@/messaging/protocol';
import { effectFor } from '@/ui/effects/effectFor';
import type { CareEffect } from '@/ui/effects/types';

export interface UseCare {
  /** The pet the stage draws: held as it was when a care was pressed, until every care in flight replies. */
  stagePet: PetState;
  care(action: CareAction): void;
}

/**
 * Sends a care and plays its effect when the engine accepts it.
 * The background saves the new state (storage.onChanged reaches the popup) before it replies,
 * so the stage holds the old pet until the reply. Otherwise the end state would flash before the
 * effect, e.g. swept poops disappearing and coming back for the broom.
 */
export function useCare(
  pet: PetState,
  send: (req: EngineRequest) => Promise<EngineResponse>,
  play: (effect: CareEffect | null) => void,
): UseCare {
  const [held, setHeld] = useState<PetState | null>(null);
  const inFlight = useRef(0);
  const care = (action: CareAction) => {
    const before = pet;
    inFlight.current += 1;
    setHeld((h) => h ?? before);
    void send({ type: 'care', action }).then((r) => {
      inFlight.current -= 1;
      if (inFlight.current === 0) setHeld(null);
      // A new accepted care replaces the running effect; a refusal leaves it be.
      if (r.ok && r.outcome?.result === 'ok') play(effectFor(action, before, r.save.game.pet));
    });
  };
  return { stagePet: held ?? pet, care };
}
