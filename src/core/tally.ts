/**
 * The key with the unique highest count above 0; a tie, all zeros or no counts give undefined.
 * Takes a record or a list of [key, count] pairs.
 */
export function uniqueTop<K extends string>(
  counts: Partial<Record<K, number>> | readonly (readonly [K, number])[],
): K | undefined {
  const entries: readonly (readonly [K, number])[] = Array.isArray(counts)
    ? counts
    : (Object.entries(counts) as [K, number][]);
  const max = Math.max(0, ...entries.map(([, n]) => n));
  if (max <= 0) return undefined;
  const top = entries.filter(([, n]) => n === max);
  const [only] = top;
  return top.length === 1 && only ? only[0] : undefined;
}
