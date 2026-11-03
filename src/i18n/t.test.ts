import { browser } from 'wxt/browser';
import { afterEach, expect, test, vi } from 'vitest';
import { syncDocumentLanguage, t } from './t';

afterEach(() => {
  Reflect.deleteProperty(browser, 'i18n');
});

function stubI18n(
  getMessage: (key: string, subs?: string | string[]) => string,
  getUILanguage: () => string = () => 'en',
) {
  Object.defineProperty(browser, 'i18n', { value: { getMessage, getUILanguage }, configurable: true });
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

test('syncDocumentLanguage sets <html lang> to the browser UI language', () => {
  stubI18n(() => '', () => 'ja');
  document.documentElement.lang = 'en';
  syncDocumentLanguage(document);
  expect(document.documentElement.lang).toBe('ja');
});
