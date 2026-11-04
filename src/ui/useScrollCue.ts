import { useEffect, useRef, useState } from 'preact/hooks';

/** How close to the bottom (px) still counts as "at the bottom". */
const BOTTOM_SLACK_PX = 2;

/**
 * Tracks whether a scrollable element still has content hidden below.
 * Returns the ref to attach and a flag that is true while more can be scrolled into view.
 * `deps` is a change key: re-measure when the content changes.
 */
export function useScrollCue<T extends HTMLElement>(deps: unknown = 0) {
  const ref = useRef<T>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () =>
      setMore(el.scrollHeight - el.clientHeight - el.scrollTop > BOTTOM_SLACK_PX);
    measure();
    el.addEventListener('scroll', measure);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [deps]);
  return [ref, more] as const;
}
