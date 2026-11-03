import { useEffect, useRef } from 'preact/hooks';

/** Focus the referenced element once on mount. */
export function useAutoFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}
