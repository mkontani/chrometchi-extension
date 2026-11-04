import { useCallback, useRef, useState } from 'preact/hooks';
import type { Cooked } from '@/core/cooking';
import type { PotItem } from '@/data/recipes';
import type { UseGame } from '@/ui/useGame';

export interface UseCooking {
  cook(items: readonly PotItem[]): Promise<void>;
  cooked: Cooked | null;
  clearCooked(): void;
}

export function useCooking(send: UseGame['send']): UseCooking {
  const [cooked, setCooked] = useState<Cooked | null>(null);
  // A cook in flight: further taps are ignored until its reply arrives.
  const busy = useRef(false);

  const cook = useCallback(
    async (items: readonly PotItem[]) => {
      if (busy.current) return;
      busy.current = true;
      try {
        const reply = await send({ type: 'cook', items: [...items] });
        // Refusals reach the player through the outcome toast, so only a finished cook is kept here.
        if (reply.ok && reply.cooked) setCooked(reply.cooked);
      } finally {
        busy.current = false;
      }
    },
    [send],
  );
  const clearCooked = useCallback(() => setCooked(null), []);
  return { cook, cooked, clearCooked };
}
