import { MAX_HIDDEN_SITES } from '@/core/constants';
import type { Settings } from '@/core/types';

/** The lowercased hostname of an http(s) page, or null for anything else (or junk). */
export function hostOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}

/** Adds `host` once; when the list is full the oldest entry drops off. */
export function addHiddenSite(list: readonly string[], host: string): string[] {
  if (list.includes(host)) return [...list];
  return [...list, host].slice(-MAX_HIDDEN_SITES);
}

export function removeHiddenSite(list: readonly string[], host: string): string[] {
  return list.filter((h) => h !== host);
}

export function isHiddenOn(settings: Pick<Settings, 'roamHiddenSites'>, host: string): boolean {
  return settings.roamHiddenSites.includes(host);
}
