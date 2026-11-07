import { t } from '@/i18n/t';

export interface TabDef<Id extends string> {
  id: Id;
  label: string;
  /** a small dot, for a tab holding something new */
  badge?: boolean;
}

interface Props<Id extends string> {
  tabs: readonly TabDef<Id>[];
  active: Id;
  onTab(next: Id): void;
  /** the accessible name of the tab strip */
  label?: string;
}

/** The small pixel tab strip shared by the food panel and the zukan. */
export function TabBar<Id extends string>({ tabs, active, onTab, label }: Props<Id>) {
  return (
    <div class="panel__tabs" role="tablist" aria-label={label}>
      {tabs.map(({ id, label, badge = false }) => (
        <button
          key={id}
          type="button"
          role="tab"
          class="panel__tab"
          aria-selected={active === id}
          aria-label={badge ? `${label} ${t('new_rewards')}` : undefined}
          onClick={() => onTab(id)}
        >
          {label}
          {badge ? <span class="panel__tab-dot" aria-hidden="true" /> : null}
        </button>
      ))}
    </div>
  );
}
