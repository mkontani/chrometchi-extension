import type { RefObject } from "preact";

/** One food row (item plus gap), the step the cue scrolls by. */
export const FOOD_ROW_PX = 50;

export const countLabel = (n: number) =>
  n === Infinity ? "∞" : `×${Math.max(0, n)}`;

/** The ▼ cue that scrolls a food grid down by one row. */
export function MoreCue({ listRef }: { listRef: RefObject<HTMLElement> }) {
  return (
    <button
      type="button"
      class="panel__more"
      aria-hidden="true"
      tabIndex={-1}
      onClick={() => listRef.current?.scrollBy({ top: FOOD_ROW_PX })}
    >
      ▼
    </button>
  );
}
