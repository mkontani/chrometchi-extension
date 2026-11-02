import type { FormDef, Memory, Zukan } from '@/core/types';
import { FORMS } from '@/data/forms';
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

export function ZukanView({ zukan }: { zukan: Zukan }) {
  const found = new Set<string>(zukan.discovered);
  const memories = [...zukan.memories].reverse();
  return (
    <div class="zukan">
      <p class="zukan__count">
        {t('zukan_count', [String(FORMS.filter((f) => found.has(f.id)).length), String(FORMS.length)])}
      </p>
      <ul class="zukan__grid">
        {FORMS.map((def) => (
          <Cell
            key={def.id}
            def={def}
            found={found.has(def.id)}
            hinted={def.from.some((p) => found.has(p))}
          />
        ))}
      </ul>
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
