import { expect, test } from 'vitest';
import { createSerialQueue } from './queue';

test('runs jobs strictly in call order without overlap', async () => {
  const enqueue = createSerialQueue();
  const log: string[] = [];
  const job = (name: string, ms: number) => async () => {
    log.push(`start ${name}`);
    await new Promise((r) => setTimeout(r, ms));
    log.push(`end ${name}`);
    return name;
  };
  const results = await Promise.all([enqueue(job('a', 20)), enqueue(job('b', 1))]);
  expect(results).toEqual(['a', 'b']);
  expect(log).toEqual(['start a', 'end a', 'start b', 'end b']);
});

test('a rejected job does not block later jobs and its caller sees the rejection', async () => {
  const enqueue = createSerialQueue();
  const failing = enqueue(async () => {
    throw new Error('boom');
  });
  const next = enqueue(async () => 'ok');
  await expect(failing).rejects.toThrow('boom');
  await expect(next).resolves.toBe('ok');
});
