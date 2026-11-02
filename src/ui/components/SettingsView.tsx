import { useState } from 'preact/hooks';
import type { Settings } from '@/core/types';
import { t } from '@/i18n/t';
import { ConfirmDialog } from './ConfirmDialog';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface Props {
  settings: Settings;
  onChange(patch: Partial<Settings>): void;
  onRestart(): void;
}

function Toggle(props: { label: string; checked: boolean; onToggle(next: boolean): void }) {
  return (
    <label class="settings__row">
      <span>{props.label}</span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.onToggle((e.currentTarget as HTMLInputElement).checked)}
      />
    </label>
  );
}

function HourSelect(props: { label: string; minutes: number; onPick(min: number): void }) {
  return (
    <label class="settings__row">
      <span>{props.label}</span>
      <select
        value={String(Math.floor(props.minutes / 60) * 60)}
        onChange={(e) => props.onPick(Number((e.currentTarget as HTMLSelectElement).value))}
      >
        {HOURS.map((h) => (
          <option key={h} value={String(h * 60)}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SettingsView({ settings, onChange, onRestart }: Props) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div class="settings">
      <Toggle
        label={t('settings_notifications')}
        checked={settings.notifications}
        onToggle={(v) => onChange({ notifications: v })}
      />
      <Toggle label={t('settings_sound')} checked={settings.sound} onToggle={(v) => onChange({ sound: v })} />
      <HourSelect
        label={t('settings_sleep_start')}
        minutes={settings.sleepStartMin}
        onPick={(m) => onChange({ sleepStartMin: m })}
      />
      <HourSelect
        label={t('settings_sleep_end')}
        minutes={settings.sleepEndMin}
        onPick={(m) => onChange({ sleepEndMin: m })}
      />
      <button type="button" class="settings__restart" onClick={() => setConfirming(true)}>
        {t('settings_restart')}
      </button>
      {confirming && (
        <ConfirmDialog
          message={t('confirm_restart')}
          confirmLabel={t('confirm_yes')}
          cancelLabel={t('confirm_no')}
          onConfirm={() => {
            setConfirming(false);
            onRestart();
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
