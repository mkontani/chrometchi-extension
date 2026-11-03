import type { EngineRequest, EngineResponse, RoamFramesResponse } from '@/messaging/protocol';
import { hostOf } from '@/roam/sites';
import type { Engine } from './engine';

interface Sender {
  id?: string;
  url?: string;
}

/** What a content script gets back: never the save, only whether it worked. */
export type ContentScriptResponse = { ok: true } | { ok: false; error: string };
type Reply = (r: EngineResponse | ContentScriptResponse | RoamFramesResponse) => void;

const FORBIDDEN: ContentScriptResponse = { ok: false, error: 'forbidden' };

type Trust = 'extension' | 'contentScript' | 'none';

/** Extension pages (popup) are fully trusted; our content scripts run on pages and are not. */
function trustOf(sender: Sender, extensionId: string): Trust {
  if (sender.id !== extensionId) return 'none';
  return sender.url?.startsWith(`chrome-extension://${extensionId}/`) ? 'extension' : 'contentScript';
}

/**
 * The one request a content script may make, rebuilt from what Chrome reports about the sender
 * (its page URL) rather than from what the message claims.
 */
function contentScriptRequest(message: unknown, sender: Sender): EngineRequest | null {
  if ((message as { type?: unknown } | null)?.type !== 'hideRoamSite') return null;
  const host = hostOf(sender.url ?? '');
  return host ? { type: 'hideRoamSite', host } : null;
}

const isRoamFrames = (message: unknown): boolean => (message as { type?: unknown } | null)?.type === 'roamFrames';

const minimal = (res: EngineResponse): ContentScriptResponse =>
  res.ok ? { ok: true } : { ok: false, error: res.error };

export function createMessageListener(
  engine: Pick<Engine, 'handle'>,
  extensionId: string,
  onHandled: (res: EngineResponse) => void = () => {},
  frames?: () => Promise<RoamFramesResponse>,
) {
  const run = (request: unknown, reply: (res: EngineResponse) => void) =>
    void engine.handle(request).then((res) => {
      onHandled(res);
      reply(res);
    });

  return (message: unknown, sender: Sender, sendResponse: Reply): true => {
    const trust = trustOf(sender, extensionId);
    if (trust === 'extension') {
      run(message, sendResponse);
      return true;
    }
    if (trust === 'contentScript' && frames && isRoamFrames(message)) {
      void frames().then(sendResponse);
      return true;
    }
    const request = trust === 'contentScript' ? contentScriptRequest(message, sender) : null;
    if (request) run(request, (res) => sendResponse(minimal(res)));
    else sendResponse(FORBIDDEN);
    return true;
  };
}
