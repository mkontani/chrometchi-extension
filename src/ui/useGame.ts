import { useCallback, useEffect, useState } from 'preact/hooks';
import type { CareOutcome } from '@/core/types';
import type { EngineRequest } from '@/messaging/protocol';
import { SAVE_KEY, saveSchema, type SaveV1 } from '@/storage/schema';
import { requestEngine } from '@/ui/api';

const SYNC_INTERVAL_MS = 60_000;

export interface UseGame {
  save: SaveV1 | null;
  outcome: CareOutcome | null;
  error: string | null;
  send(req: EngineRequest): Promise<void>;
}

export function useGame(): UseGame {
  const [save, setSave] = useState<SaveV1 | null>(null);
  const [outcome, setOutcome] = useState<CareOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async (req: EngineRequest) => {
    const r = await requestEngine(req);
    if (r.ok) {
      setSave(r.save);
      setOutcome(r.outcome ?? null);
      setError(null);
    } else {
      setError(r.error);
    }
  }, []);

  useEffect(() => {
    void send({ type: 'sync' });
    const timer = setInterval(() => void send({ type: 'sync' }), SYNC_INTERVAL_MS);
    const onChanged = (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes[SAVE_KEY]) return;
      const parsed = saveSchema.safeParse(changes[SAVE_KEY].newValue);
      if (parsed.success) setSave(parsed.data);
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => {
      clearInterval(timer);
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, [send]);

  return { save, outcome, error, send };
}
