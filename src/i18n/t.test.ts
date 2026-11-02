import { browser } from 'wxt/browser';
import { afterEach, expect, test, vi } from 'vitest';
import { t } from './t';

afterEach(() => {
  Reflect.deleteProperty(browser, 'i18n');
});

function stubI18n(getMessage: (key: string, subs?: string | string[]) => string) {
  Object.defineProperty(browser, 'i18n', { value: { getMessage }, configurable: true });
}

test('t returns the translated message', () => {
  stubI18n((k) => (k === 'appName' ? 'Chrometchi' : ''));
  expect(t('appName')).toBe('Chrometchi');
});

test('t falls back to key when message missing', () => {
  stubI18n(() => '');
  expect(t('nope')).toBe('nope');
});

test('t forwards substitutions', () => {
  const spy = vi.fn(() => 'x');
  stubI18n(spy);
  t('k', ['a']);
  expect(spy).toHaveBeenCalledWith('k', ['a']);
});
