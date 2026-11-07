import { cleanup, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { Overlay } from './Overlay';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));

afterEach(cleanup);

test('header extra is drawn between the title and the close button', () => {
  render(
    <Overlay title="Title" onClose={() => undefined} headerExtra={<span>extra</span>}>
      body
    </Overlay>,
  );
  const header = document.querySelector('header');
  const order = Array.from(header?.children ?? []).map((el) => el.textContent);
  expect(order).toEqual(['Title', 'extra', '×']);
  expect(screen.getByText('body')).toBeTruthy();
});
