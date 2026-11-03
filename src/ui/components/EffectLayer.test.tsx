import { cleanup, render } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { EffectLayer } from './EffectLayer';

vi.mock('@/ui/assets', () => ({
  foodUrl: (food: string, bites: number) => `food-${food}-${bites}.png`,
  effectUrl: (id: string) => (id === 'note' ? null : `fx-${id}.png`),
  iconUrl: (id: string) => `icon-${id}.png`,
}));
afterEach(cleanup);

const img = (c: Element) => c.querySelector('img') as HTMLImageElement;

test('a food prop is drawn at its place and size with the bitten picture', () => {
  const { container } = render(
    <EffectLayer props={[{ key: 'food', art: { kind: 'food', food: 'rice', bites: 1 }, x: 208, y: 148, scale: 2 }]} flash={false} />,
  );
  expect(img(container).getAttribute('src')).toBe('food-rice-1.png');
  expect(img(container).className).toBe('fx-prop fx-prop--food');
  expect([img(container).width, img(container).height]).toEqual([64, 64]);
  expect(img(container).style.left).toBe('208px');
  expect(img(container).style.top).toBe('148px');
});

test('icons and effects use their 16 px art times the scale', () => {
  const { container } = render(
    <EffectLayer
      props={[
        { key: 'broom', art: { kind: 'icon', id: 'clean' }, x: 0, y: 200, scale: 4 },
        { key: 'sparkle', art: { kind: 'effect', id: 'sparkle' }, x: 2, y: 4, scale: 1 },
      ]}
      flash={false}
    />,
  );
  const [broom, sparkle] = [...container.querySelectorAll('img')];
  expect([broom!.getAttribute('src'), broom!.width, broom!.className]).toEqual(['icon-clean.png', 64, 'fx-prop fx-prop--icon']);
  expect([sparkle!.getAttribute('src'), sparkle!.width]).toEqual(['fx-sparkle.png', 16]);
});

test('a prop without art is skipped', () => {
  const { container } = render(
    <EffectLayer props={[{ key: 'n', art: { kind: 'effect', id: 'note' }, x: 0, y: 0, scale: 2 }]} flash={false} />,
  );
  expect(container.querySelectorAll('img')).toHaveLength(0);
});

test('flash draws a bright overlay', () => {
  expect(render(<EffectLayer props={[]} flash />).container.querySelector('.stage__flash')).not.toBeNull();
  cleanup();
  expect(render(<EffectLayer props={[]} flash={false} />).container.querySelector('.stage__flash')).toBeNull();
});
