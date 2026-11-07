import { cleanup, render, screen, within } from '@testing-library/preact';
import { afterEach, expect, test, vi } from 'vitest';
import en from '../../../public/_locales/en/messages.json';
import { EMPTY_PROGRESS } from '@/core/progress';
import type { Progress, RewardId } from '@/core/types';
import { MissionList, rewardReasonText } from './MissionList';

type Entry = { message: string; placeholders?: Record<string, { content: string }> };
const MESSAGES = en as Record<string, Entry>;

vi.mock('@/i18n/t', () => ({
  t: (key: string, subs?: string | string[]) => {
    const entry = MESSAGES[key];
    if (!entry) return key;
    const list = [subs ?? []].flat();
    return entry.message.replace(/\$(\w+)\$/g, (_m, name: string) => {
      const content = entry.placeholders?.[name.toLowerCase()]?.content ?? '';
      return content.replace(/\$(\d)/g, (_x, n: string) => list[Number(n) - 1] ?? '');
    });
  },
}));
vi.mock('@/ui/assets', () => ({ iconUrl: (id: string) => `${id}.png` }));
afterEach(cleanup);

const progress = (patch: Partial<Progress> = {}): Progress => ({ ...EMPTY_PROGRESS, ...patch });

test('each mission shows its next target and reward', () => {
  const p = progress({ counts: { ...EMPTY_PROGRESS.counts, clean: 12 }, claimed: ['mission:clean:1'] });
  render(<MissionList progress={p} />);
  const rows = screen.getAllByRole('listitem');
  expect(rows).toHaveLength(6);
  const clean = within(rows[0] as HTMLElement);
  expect(clean.getByText('Clean')).toBeTruthy();
  expect(clean.getByText('12 / 30')).toBeTruthy();
  expect(clean.getByRole('img', { name: 'Coins: 80' })).toBeTruthy();
  expect(rows[0]?.querySelector('img')?.getAttribute('src')).toBe('coin.png');
});

test('a finished mission says all done', () => {
  const claimed: RewardId[] = ['mission:cook:1', 'mission:cook:2', 'mission:cook:3'];
  render(<MissionList progress={progress({ claimed })} />);
  const cook = within(screen.getAllByRole('listitem')[5] as HTMLElement);
  expect(cook.getByText('All done')).toBeTruthy();
  expect(cook.queryByRole('img')).toBeNull();
});

test('recent rewards are listed newest first, and the section is hidden when empty', () => {
  const { rerender } = render(<MissionList progress={progress()} />);
  expect(screen.queryByText('Recent rewards')).toBeNull();
  rerender(
    <MissionList
      progress={progress({
        recent: [
          { reason: 'ending:dead', coins: 30, at: 2 },
          { reason: 'zukan:10', coins: 50, at: 1 },
        ],
      })}
    />,
  );
  expect(screen.getByText('Recent rewards')).toBeTruthy();
  const items = document.querySelectorAll('.missions__recent li');
  expect(items).toHaveLength(2);
  expect(items[0]?.textContent).toContain('A farewell');
  expect(items[1]?.textContent).toContain('10 in the zukan');
  expect(within(items[0] as HTMLElement).getByRole('img', { name: 'Coins: 30' })).toBeTruthy();
});

test('rewardReasonText names each kind of reward', () => {
  expect(rewardReasonText('zukan:10')).toBe('10 in the zukan');
  expect(rewardReasonText('mission:feed:2')).toBe('Feed ×60');
  expect(rewardReasonText('ending:departed')).toBe('A happy send-off');
  expect(rewardReasonText('ending:dead')).toBe('A farewell');
});
