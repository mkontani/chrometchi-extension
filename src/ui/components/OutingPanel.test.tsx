import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import { EMPTY_KITCHEN, dayKey } from '@/core/kitchen';
import type { Kitchen } from '@/core/types';
import { OutingPanel } from './OutingPanel';

vi.mock('@/i18n/t', () => ({ t: (k: string, s?: string | string[]) => (s === undefined ? k : `${k}:${s}`) }));
const art = vi.hoisted(() => ({ missing: new Set<string>() }));
vi.mock('@/ui/assets', () => ({ assetUrl: (p: string) => (art.missing.has(p) ? null : `${p}.png`) }));
afterEach(() => {
  cleanup();
  art.missing.clear();
});

const NOW = new Date(2026, 10, 4, 12).getTime();
const kitchen = (patch: Partial<Kitchen> = {}): Kitchen => ({ ...EMPTY_KITCHEN, ...patch });
const props = { now: NOW, onGo: vi.fn(), onFarm: vi.fn(), onClose: vi.fn() };
const btn = (text: string) => screen.getByText(text).closest('button') as HTMLButtonElement;

test('each outing shows the trips left today and is disabled at 0', () => {
  const k = kitchen({ outings: { day: dayKey(NOW), used: { fishing: 1, hunting: 3, gathering: 0 } } });
  const onGo = vi.fn();
  render(<OutingPanel {...props} kitchen={k} onGo={onGo} />);
  expect(screen.getByText('outing_left:2')).toBeTruthy();
  expect(screen.getByText('outing_left:0')).toBeTruthy();
  expect(screen.getByText('outing_left:3')).toBeTruthy();
  expect(btn('outing_hunting').disabled).toBe(true);
  expect(btn('outing_fishing').disabled).toBe(false);
  fireEvent.click(btn('outing_fishing'));
  expect(onGo).toHaveBeenCalledWith('fishing');
});

test('an empty field offers to plant veggie or fruit', () => {
  const onFarm = vi.fn();
  render(<OutingPanel {...props} kitchen={kitchen()} onFarm={onFarm} />);
  fireEvent.click(btn('farm_plant_veggie'));
  expect(onFarm).toHaveBeenCalledWith({ op: 'plant', crop: 'veggie' });
  fireEvent.click(btn('farm_plant_fruit'));
  expect(onFarm).toHaveBeenCalledWith({ op: 'plant', crop: 'fruit' });
});

test('a growing field shows the time left and a water button until watered', () => {
  const onFarm = vi.fn();
  const farm = { crop: 'veggie' as const, growMinLeft: 90, watered: false };
  render(<OutingPanel {...props} kitchen={kitchen({ farm })} onFarm={onFarm} />);
  expect(screen.getByText('farm_growing_hours:2')).toBeTruthy();
  fireEvent.click(btn('farm_water'));
  expect(onFarm).toHaveBeenCalledWith({ op: 'water' });
  cleanup();
  render(<OutingPanel {...props} kitchen={kitchen({ farm: { ...farm, growMinLeft: 30, watered: true } })} />);
  expect(screen.getByText('farm_growing_minutes:30')).toBeTruthy();
  expect(screen.queryByText('farm_water')).toBeNull();
});

test('a ready field offers harvest', () => {
  const onFarm = vi.fn();
  const farm = { crop: 'fruit' as const, growMinLeft: 0, watered: false };
  render(<OutingPanel {...props} kitchen={kitchen({ farm })} onFarm={onFarm} />);
  fireEvent.click(btn('farm_harvest'));
  expect(onFarm).toHaveBeenCalledWith({ op: 'harvest' });
});

const growing = { crop: 'veggie' as const, growMinLeft: 90, watered: false };

test('a growing crop shows the sprout picture', () => {
  const { container } = render(<OutingPanel {...props} kitchen={kitchen({ farm: growing })} />);
  expect(container.querySelector('img[src="ui/outing/sprout.png"]')).toBeTruthy();
});

test('a watered crop shows the darker wet sprout instead', () => {
  const farm = { ...growing, watered: true };
  const { container } = render(<OutingPanel {...props} kitchen={kitchen({ farm })} />);
  expect(container.querySelector('img[src="ui/outing/sprout_wet.png"]')).toBeTruthy();
  expect(container.querySelector('img[src="ui/outing/sprout.png"]')).toBeNull();
});

test('the water button shows the can picture', () => {
  render(<OutingPanel {...props} kitchen={kitchen({ farm: growing })} />);
  expect(btn('farm_water').querySelector('img[src="ui/outing/can.png"]')).toBeTruthy();
});

test('missing sprout and can art render no image', () => {
  art.missing.add('ui/outing/sprout').add('ui/outing/can');
  const { container } = render(<OutingPanel {...props} kitchen={kitchen({ farm: growing })} />);
  expect(container.querySelector('img')).toBeNull();
});
