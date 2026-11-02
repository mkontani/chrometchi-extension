/** Translate via browser.i18n; returns the key itself when the message is missing. */
export function t(key: string, subs?: string | string[]): string {
  const msg = (
    browser.i18n.getMessage as (key: string, subs?: string | string[]) => string
  )(key, subs);
  return msg || key;
}

/** Mirror the browser UI language (the locale chrome.i18n renders) on <html lang>. */
export function syncDocumentLanguage(doc: Document): void {
  doc.documentElement.lang = browser.i18n.getUILanguage();
}
