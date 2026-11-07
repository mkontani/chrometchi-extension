import type { ComponentChildren } from 'preact';
import { useScrollCue } from '@/ui/useScrollCue';
import { MoreCue } from './foodGrid';

interface Props {
  class: string;
  children: ComponentChildren;
}

/** A list that scrolls inside its box and shows the ▼ cue while more is hidden below. */
export function ScrollList({ class: className, children }: Props) {
  const [listRef, more] = useScrollCue<HTMLUListElement>();
  return (
    <div class="shop__scroll">
      <ul class={className} ref={listRef}>
        {children}
      </ul>
      {more && <MoreCue listRef={listRef} />}
    </div>
  );
}
