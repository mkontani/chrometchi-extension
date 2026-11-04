export interface TabDef<Id extends string> {
  id: Id;
  label: string;
}

interface Props<Id extends string> {
  tabs: readonly TabDef<Id>[];
  active: Id;
  onTab(next: Id): void;
}

/** The small pixel tab strip shared by the food panel and the zukan. */
export function TabBar<Id extends string>({ tabs, active, onTab }: Props<Id>) {
  return (
    <div class="panel__tabs" role="tablist">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          class="panel__tab"
          aria-selected={active === id}
          onClick={() => onTab(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
