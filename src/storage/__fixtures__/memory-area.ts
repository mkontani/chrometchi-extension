import type { KeyValueArea } from '../schema';

export interface MemoryArea extends KeyValueArea {
  data: Map<string, unknown>;
}

export function createMemoryArea(initial: Record<string, unknown> = {}): MemoryArea {
  const data = new Map<string, unknown>(Object.entries(initial));
  return {
    data,
    async get(keys) {
      const out: Record<string, unknown> = {};
      for (const k of keys) if (data.has(k)) out[k] = data.get(k);
      return out;
    },
    async set(items) {
      for (const [k, v] of Object.entries(items)) data.set(k, v);
    },
    async remove(keys) {
      for (const k of keys) data.delete(k);
    },
  };
}
