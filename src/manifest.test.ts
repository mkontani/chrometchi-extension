import { expect, test } from 'vitest';
import config from '../wxt.config';

test('manifest requires Chrome 110+ (Array.prototype.toSorted)', () => {
  expect(config.manifest).toMatchObject({ minimum_chrome_version: '110' });
});
