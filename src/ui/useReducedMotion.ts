import { useEffect, useState } from 'preact/hooks';

const QUERY = '(prefers-reduced-motion: reduce)';

const query = (): MediaQueryList | null => (typeof matchMedia === 'function' ? matchMedia(QUERY) : null);

/** Whether the OS asks for less motion; follows changes while mounted. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const mql = query();
    if (!mql) return;
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
