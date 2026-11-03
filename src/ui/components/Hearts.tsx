import { iconUrl, type IconId } from '@/ui/assets';

export const HEARTS_PER_STAT = 4;
const POINTS_PER_HALF = 12.5;

export interface HeartCounts {
  full: number;
  half: number;
  empty: number;
}

export function heartCounts(value: number): HeartCounts {
  const halves = Math.max(0, Math.min(HEARTS_PER_STAT * 2, Math.round(value / POINTS_PER_HALF)));
  const full = Math.floor(halves / 2);
  const half = halves % 2;
  return { full, half, empty: HEARTS_PER_STAT - full - half };
}

type Kind = 'full' | 'half' | 'empty';

function Heart({ kind }: { kind: Kind }) {
  const url = iconUrl(`heart_${kind}` as IconId);
  return url ? (
    <img class={`heart heart--${kind}`} src={url} width={16} height={16} alt="" />
  ) : (
    <span class={`heart heart--${kind}`} />
  );
}

export function Hearts({ label, value }: { label: string; value: number }) {
  const { full, half, empty } = heartCounts(value);
  const kinds: Kind[] = [
    ...Array<Kind>(full).fill('full'),
    ...Array<Kind>(half).fill('half'),
    ...Array<Kind>(empty).fill('empty'),
  ];
  return (
    <div class="stat-row" role="img" aria-label={label}>
      <span class="stat-label" aria-hidden="true">{label}</span>
      <span class="hearts">
        {kinds.map((k, i) => (
          <Heart key={i} kind={k} />
        ))}
      </span>
    </div>
  );
}
