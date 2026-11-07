import { missionStatus } from '@/core/progress';
import type { MissionKind, Progress, RecentReason } from '@/core/types';
import { MISSION_KINDS, MISSIONS } from '@/data/economy';
import { t } from '@/i18n/t';
import { CoinAmount } from '@/ui/components/CoinAmount';

/** `zukan:10`, `mission:feed:2` and the two endings, as a short phrase. */
export function rewardReasonText(reason: RecentReason): string {
  if (reason === 'ending:departed') return t('reward_departed');
  if (reason === 'ending:dead') return t('reward_dead');
  const [kind, a, b] = reason.split(':');
  if (kind === 'zukan') return t('reward_zukan', a ?? '');
  const mission = a as MissionKind;
  const target = MISSIONS[mission]?.[Number(b) - 1]?.target ?? 0;
  return t('reward_mission', [t(`mission_${mission}`), String(target)]);
}

function Row({ progress, kind }: { progress: Progress; kind: MissionKind }) {
  const status = missionStatus(progress, kind);
  return (
    <li class="missions__row">
      <span class="missions__text">
        <span class="missions__name">{t(`mission_${kind}`)}</span>
        <small class="missions__detail">
          {status.tier === null ? t('mission_done') : t('mission_progress', [String(status.count), String(status.target)])}
        </small>
        {status.tier === null ? null : <small class="missions__detail">{t('mission_tier', String(status.tier))}</small>}
      </span>
      {status.tier === null ? null : <CoinAmount amount={status.coins} />}
    </li>
  );
}

function Recent({ recent }: { recent: Progress['recent'] }) {
  if (recent.length === 0) return null;
  return (
    <section class="missions__recent">
      <h3 class="missions__heading">{t('rewards_recent')}</h3>
      <ul class="missions__list">
        {recent.map((r, i) => (
          <li key={`${r.at}-${i}`} class="missions__row">
            <span class="missions__text">{rewardReasonText(r.reason)}</span>
            <CoinAmount amount={r.coins} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MissionList({ progress }: { progress: Progress }) {
  return (
    <div class="missions">
      <ul class="missions__list">
        {MISSION_KINDS.map((kind) => (
          <Row key={kind} progress={progress} kind={kind} />
        ))}
      </ul>
      <Recent recent={progress.recent} />
    </div>
  );
}
