/** Translate via browser.i18n; returns the key itself when the message is missing. */
export function t(key: string, subs?: string | string[]): string {
  const msg = (
    browser.i18n.getMessage as (key: string, subs?: string | string[]) => string
  )(key, subs);
  return msg || key;
}
