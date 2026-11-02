import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import type { Settings } from '@/core/types';
import { SettingsView } from './SettingsView';

vi.mock('@/i18n/t', () => ({ t: (k: string) => k }));
afterEach(cleanup);

const settings: Settings = { notifications: true, sound: false, sleepStartMin: 22 * 60, sleepEndMin: 7 * 60 };

function setup() {
  const onChange = vi.fn();
  const onRestart = vi.fn();
  render(<SettingsView settings={settings} onChange={onChange} onRestart={onRestart} />);
  return { onChange, onRestart };
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
