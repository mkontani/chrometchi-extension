import type { EngineResponse } from '@/messaging/protocol';
import type { Engine } from './engine';

export function createMessageListener(engine: Pick<Engine, 'handle'>, extensionId: string) {
  return (
    message: unknown,
    sender: { id?: string },
    sendResponse: (r: EngineResponse) => void,
  ): true => {
    if (sender.id !== extensionId) {
      sendResponse({ ok: false, error: 'forbidden' });
    } else {
      void engine.handle(message).then(sendResponse);
    }
    return true;
  };
}
