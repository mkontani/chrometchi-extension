import type { EngineRequest, EngineResponse } from '@/messaging/protocol';

function isResponse(value: unknown): value is EngineResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { ok?: unknown }).ok === 'boolean'
  );
}

export async function requestEngine(req: EngineRequest): Promise<EngineResponse> {
  try {
    const res: unknown = await browser.runtime.sendMessage(req);
    return isResponse(res) ? res : { ok: false, error: 'no response' };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : 'no response' };
  }
}
