/** Minimal typing for the `chrome` global used inside `serviceWorker.evaluate` callbacks. */
declare const chrome: {
  storage: {
    local: {
      get(keys: string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    };
  };
  i18n: { getMessage(key: string): string };
};
