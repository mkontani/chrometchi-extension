import { useEffect, useState } from 'preact/hooks';
import type { CareOutcome } from '@/core/types';
import type { Reaction } from '@/ui/components/PetStage';

const REACTION_MS = 1000;

export interface ReactionState {
  reaction: Reaction;
  fromPlay: boolean;
}

const NONE: ReactionState = { reaction: null, fromPlay: false };

function reactionFor(outcome: CareOutcome | null): ReactionState {
  if (outcome?.result !== 'ok') return NONE;
  switch (outcome.action) {
    case 'feed':
      return { reaction: 'eat', fromPlay: false };
    case 'play':
      return { reaction: 'happy', fromPlay: true };
    case 'pet':
      return { reaction: 'happy', fromPlay: false };
    default:
      return NONE;
  }
}

/** Shows a short pose for each new ok outcome (keyed on object identity). */
export function useReaction(outcome: CareOutcome | null): ReactionState {
  const [state, setState] = useState<ReactionState>(NONE);

  useEffect(() => {
    const next = reactionFor(outcome);
    if (!next.reaction) {
      setState(NONE);
      return;
    }
    setState(next);
    const id = setTimeout(() => setState(NONE), REACTION_MS);
    return () => clearTimeout(id);
  }, [outcome]);

  return state;
}
