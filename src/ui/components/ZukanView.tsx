import type { FormDef, Memory, Zukan } from '@/core/types';
import { FORMS } from '@/data/forms';
import { ZUKAN_ORDER } from '@/data/zukan';
import { t } from '@/i18n/t';
import { spriteUrl } from '@/ui/assets';

function Cell({ def, found, hinted }: { def: FormDef; found: boolean; hinted: boolean }) {
  return (
    <li class="zukan__cell">
      <img
        class={found ? undefined : 'silhouette'}
        src={spriteUrl(def.id, 'idle0')}
        width={64}
        height={64}
        alt=""
      />
      <span class="zukan__name">{found ? t(`form_${def.id}`) : t('zukan_unknown')}</span>
      {!found && hinted && <small class="zukan__hint">{t(`hint_${def.id}`)}</small>}
    </li>
  );
}

function memoryLine(m: Memory): string {
  const ending = t(m.ending === 'dead' ? 'ending_dead' : 'ending_departed');
  return t('memory_line', [
    String(m.generation),
    t(`form_${m.finalForm}`),
    ending,
    String(Math.floor(m.awakeMinutes / 60)),
  ]);
}

const DEF_BY_ID = new Map(FORMS.map((f) => [f.id as string, f]));

function Row({ ids, found }: { ids: readonly string[]; found: Set<string> }) {
  return (
    <ul class="zukan__row">
      {ids.map((id) => {
        const def = DEF_BY_ID.get(id);
        if (!def) return null;
        const hinted = def.stage !== 'egg' && def.stage !== 'baby' && def.from.some((p) => found.has(p));
        return <Cell key={id} def={def} found={found.has(id)} hinted={hinted} />;
      })}
    </ul>
  );
}

function Section({ title, rows, found }: { title: string; rows: readonly (readonly string[])[]; found: Set<string> }) {
  return (
    <section class="zukan__section">
      <h3>{title}</h3>
      {rows.map((ids) => (
        <Row key={ids[0]} ids={ids} found={found} />
      ))}
    </section>
  );
}

export function ZukanView({ zukan }: { zukan: Zukan }) {
  const found = new Set<string>(zukan.discovered);
  const memories = [...zukan.memories].reverse();
  return (
    <div class="zukan">
      <p class="zukan__count">
        {t('zukan_count', [String(FORMS.filter((f) => found.has(f.id)).length), String(FORMS.length)])}
      </p>
      <Section title={t('zukan_section_early')} rows={[ZUKAN_ORDER.early]} found={found} />
      {ZUKAN_ORDER.families.map((f) => (
        <Section key={f.family} title={t(`family_${f.family}`)} rows={[f.young, f.adults]} found={found} />
      ))}
      {memories.length > 0 && (
        <section class="memories">
          <h3>{t('memories_title')}</h3>
          <ul>
            {memories.map((m) => (
              <li key={`${m.generation}-${m.endedAt}`}>{memoryLine(m)}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
