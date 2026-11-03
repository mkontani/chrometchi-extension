import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import type { Settings } from '@/core/types';
import { SettingsView } from './SettingsView';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
afterEach(cleanup);

const settings: Settings = {
  notifications: true, sound: false, sleepStartMin: 22 * 60, sleepEndMin: 7 * 60, roam: false, roamHiddenSites: [],
};

function setup(over: Partial<Settings> = {}) {
  const onChange = vi.fn();
  const onRestart = vi.fn();
  const onRoamToggle = vi.fn();
  render(
    <SettingsView settings={{ ...settings, ...over }} onChange={onChange} onRestart={onRestart} onRoamToggle={onRoamToggle} />,
  );
  return { onChange, onRestart, onRoamToggle };
}

test('toggles send a single-field patch', () => {
  const { onChange } = setup();
  fireEvent.click(screen.getByLabelText('settings_sound'));
  expect(onChange).toHaveBeenCalledWith({ sound: true });
  fireEvent.click(screen.getByLabelText('settings_notifications'));
  expect(onChange).toHaveBeenLastCalledWith({ notifications: false });
});

test('sleep hour select sends minutes', () => {
  const { onChange } = setup();
  const select = screen.getByLabelText('settings_sleep_start') as HTMLSelectElement;
  expect(select.value).toBe(String(22 * 60));
  fireEvent.change(select, { target: { value: String(23 * 60) } });
  expect(onChange).toHaveBeenCalledWith({ sleepStartMin: 23 * 60 });
  fireEvent.change(screen.getByLabelText('settings_sleep_end'), { target: { value: '360' } });
  expect(onChange).toHaveBeenLastCalledWith({ sleepEndMin: 360 });
});

test('restart requires confirmation in the styled dialog', () => {
  const confirm = vi.fn();
  vi.stubGlobal('confirm', confirm);
  const { onRestart } = setup();
  fireEvent.click(screen.getByText('settings_restart'));
  expect(onRestart).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('confirm_yes'));
  expect(onRestart).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

test('cancelling the dialog does not restart', () => {
  const { onRestart } = setup();
  fireEvent.click(screen.getByText('settings_restart'));
  fireEvent.click(screen.getByText('confirm_no'));
  expect(onRestart).not.toHaveBeenCalled();
  expect(screen.queryByRole('alertdialog')).toBeNull();
});

test('toggling roam calls onRoamToggle, not onChange', () => {
  const { onChange, onRoamToggle } = setup();
  expect(screen.getByText('settings_roam_note')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('settings_roam'));
  expect(onRoamToggle).toHaveBeenCalledWith(true);
  expect(onChange).not.toHaveBeenCalled();
});

test('the roam box shows the saved setting, not the click, until the save changes (a refused prompt leaves it off)', () => {
  setup();
  const box = screen.getByLabelText('settings_roam') as HTMLInputElement;
  fireEvent.click(box);
  expect(box.checked).toBe(false);
});

test('hidden sites are listed and can be shown again', () => {
  const { onChange } = setup({ roam: true, roamHiddenSites: ['a.com', 'b.com'] });
  expect(screen.getByText('settings_roam_hidden')).toBeTruthy();
  expect(screen.getByText('a.com')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'settings_roam_unhide: a.com' }));
  expect(onChange).toHaveBeenCalledWith({ roamHiddenSites: ['b.com'] });
});

test('no hidden-sites section when the list is empty', () => {
  setup({ roam: true });
  expect(screen.queryByText('settings_roam_hidden')).toBeNull();
});
