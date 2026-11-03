/** Minimal typing for the `chrome` global used inside `evaluate` callbacks (worker and popup). */
declare const chrome: {
  storage: {
    local: {
      get(keys: string | string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
      remove(keys: string | string[]): Promise<void>;
    };
  };
  i18n: { getMessage(key: string): string };
  runtime: { sendMessage(message: unknown): Promise<unknown> };
};
