import { describe, expect, test } from 'vitest';
import { MAX_HIDDEN_SITES } from '@/core/constants';
import { addHiddenSite, hostOf, isHiddenOn, removeHiddenSite } from './sites';

describe('hostOf', () => {
  test('returns the lowercased hostname of web pages', () => {
    expect(hostOf('https://Example.COM:8080/a?b')).toBe('example.com');
    expect(hostOf('http://localhost/')).toBe('localhost');
  });

  test.each(['file:///x', 'chrome://newtab', 'chrome-extension://abc/popup.html', 'nonsense', ''])(
    'is null for %s',
    (url) => {
      expect(hostOf(url)).toBeNull();
    },
  );
});

describe('hidden sites', () => {
  test('adding a site twice keeps one entry', () => {
    expect(addHiddenSite(addHiddenSite([], 'a.com'), 'a.com')).toEqual(['a.com']);
  });

  test('a full list drops its oldest entry', () => {
    const full = Array.from({ length: MAX_HIDDEN_SITES }, (_, i) => `s${i}.com`);
    const next = addHiddenSite(full, 'new.com');
    expect(next).toHaveLength(MAX_HIDDEN_SITES);
    expect(next[0]).toBe('s1.com');
    expect(next.at(-1)).toBe('new.com');
    expect(full[0]).toBe('s0.com');
  });

  test('removing only removes that host', () => {
    expect(removeHiddenSite(['a.com', 'b.com'], 'a.com')).toEqual(['b.com']);
  });

  test('isHiddenOn checks the list', () => {
    expect(isHiddenOn({ roamHiddenSites: ['a.com'] }, 'a.com')).toBe(true);
    expect(isHiddenOn({ roamHiddenSites: ['a.com'] }, 'b.com')).toBe(false);
  });
});
