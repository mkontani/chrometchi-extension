import type { EngineResponse } from '@/messaging/protocol';
import type { Engine } from './engine';

interface Sender {
  id?: string;
  url?: string;
}

/** Requests a content script (a sender on a web page) may make; everything else is refused. */
const CONTENT_SCRIPT_TYPES = new Set(['hideRoamSite']);

type Trust = 'extension' | 'contentScript' | 'none';

/** Extension pages (popup) are fully trusted; our content scripts run on pages and are not. */
function trustOf(sender: Sender, extensionId: string): Trust {
  if (sender.id !== extensionId) return 'none';
  return sender.url?.startsWith(`chrome-extension://${extensionId}/`) ? 'extension' : 'contentScript';
}

function allowed(message: unknown, trust: Trust): boolean {
  if (trust === 'extension') return true;
  if (trust === 'none') return false;
  const type = (message as { type?: unknown } | null)?.type;
  return typeof type === 'string' && CONTENT_SCRIPT_TYPES.has(type);
}

export function createMessageListener(
  engine: Pick<Engine, 'handle'>,
  extensionId: string,
  onHandled: (res: EngineResponse) => void = () => {},
) {
  return (message: unknown, sender: Sender, sendResponse: (r: EngineResponse) => void): true => {
    if (!allowed(message, trustOf(sender, extensionId))) {
      sendResponse({ ok: false, error: 'forbidden' });
    } else {
      void engine.handle(message).then((res) => {
        onHandled(res);
        sendResponse(res);
      });
    }
    return true;
  };
}
