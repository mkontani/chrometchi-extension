export type SerialQueue = <T>(job: () => Promise<T>) => Promise<T>;

/** Runs jobs strictly one after another; a rejection never breaks the chain. */
export function createSerialQueue(): SerialQueue {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(job: () => Promise<T>): Promise<T> => {
    const result = tail.then(job);
    tail = result.catch(() => undefined);
    return result;
  };
}
