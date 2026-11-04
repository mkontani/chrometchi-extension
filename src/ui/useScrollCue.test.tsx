import { act, cleanup, render } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { useScrollCue } from './useScrollCue';

interface Metrics { scrollHeight: number; clientHeight: number; scrollTop: number }

let cue = false;
function Probe({ dep = 0 }: { dep?: number }) {
  const [ref, more] = useScrollCue<HTMLDivElement>(dep);
  cue = more;
  return <div ref={ref} data-testid="box" />;
}

function stub(el: Element, m: Metrics) {
  for (const k of ['scrollHeight', 'clientHeight', 'scrollTop'] as const) {
    Object.defineProperty(el, k, { configurable: true, get: () => m[k] });
  }
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  cue = false;
});

test('is false when everything fits', () => {
  const { getByTestId, rerender } = render(<Probe />);
  stub(getByTestId('box'), { scrollHeight: 100, clientHeight: 100, scrollTop: 0 });
  rerender(<Probe dep={1} />);
  expect(cue).toBe(false);
});

test('is true while more content hides below', () => {
  const { getByTestId, rerender } = render(<Probe />);
  stub(getByTestId('box'), { scrollHeight: 200, clientHeight: 100, scrollTop: 0 });
  rerender(<Probe dep={1} />);
  expect(cue).toBe(true);
});

test('follows scrolling and hides at the bottom within 2px', () => {
  const { getByTestId } = render(<Probe />);
  const box = getByTestId('box');
  const m = { scrollHeight: 200, clientHeight: 100, scrollTop: 0 };
  stub(box, m);
  act(() => { box.dispatchEvent(new Event('scroll')); });
  expect(cue).toBe(true);
  m.scrollTop = 98;
  act(() => { box.dispatchEvent(new Event('scroll')); });
  expect(cue).toBe(false);
  m.scrollTop = 50;
  act(() => { box.dispatchEvent(new Event('scroll')); });
  expect(cue).toBe(true);
});

test('re-measures when a ResizeObserver fires and disconnects on unmount', () => {
  let fire = () => {};
  const disconnect = vi.fn();
  class RO {
    constructor(cb: () => void) { fire = cb; }
    observe() {}
    disconnect = disconnect;
  }
  vi.stubGlobal('ResizeObserver', RO);
  const { getByTestId, unmount } = render(<Probe />);
  stub(getByTestId('box'), { scrollHeight: 300, clientHeight: 100, scrollTop: 0 });
  act(() => fire());
  expect(cue).toBe(true);
  unmount();
  expect(disconnect).toHaveBeenCalled();
});
