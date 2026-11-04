import type { Pantry } from "@/core/types";
import { POT_MAX } from "@/core/cooking";
import { stockOf } from "@/core/pantry";
import { FOODS } from "@/data/foods";
import { POT_ITEMS, type PotItem } from "@/data/recipes";
import { t } from "@/i18n/t";
import { iconUrl } from "@/ui/assets";
import { useScrollCue } from "@/ui/useScrollCue";
import { countLabel, MoreCue } from "./foodGrid";

interface Props {
  pantry: Pantry;
  pot: readonly PotItem[];
  onPot(next: readonly PotItem[]): void;
  onCook(items: readonly PotItem[]): void;
}

const POT_FOODS = POT_ITEMS.map((id) => FOODS.find((f) => f.id === id)!);
const SLOT_INDEXES = Array.from({ length: POT_MAX }, (_, i) => i);

interface PotRowProps {
  pot: readonly PotItem[];
  onRemove(index: number): void;
  onCook(items: readonly PotItem[]): void;
}

/** The 4 pot slots, the hint while empty, and the cook button. */
function PotRow({ pot, onRemove, onCook }: PotRowProps) {
  return (
    <div class="cook__pot" role="group" aria-label={t("cook_pot")}>
      {SLOT_INDEXES.map((i) => {
        const item = pot[i];
        const url = item ? iconUrl(`food_${item}`) : null;
        return item ? (
          <button
            key={i}
            type="button"
            class="cook__slot cook__slot--filled"
            aria-label={t(`food_${item}`)}
            onClick={() => onRemove(i)}
          >
            {url ? <img src={url} width={24} height={24} alt="" /> : null}
          </button>
        ) : (
          <span key={i} class="cook__slot" aria-hidden="true" />
        );
      })}
      {pot.length === 0 && (
        <small class="cook__hint">{t("cook_pot_empty")}</small>
      )}
      <button
        type="button"
        class="cook__make"
        disabled={pot.length === 0}
        onClick={() => onCook(pot)}
      >
        {t("cook_make")}
      </button>
    </div>
  );
}

interface IngredientProps {
  food: (typeof POT_FOODS)[number];
  left: number;
  full: boolean;
  onAdd(item: PotItem): void;
}

function Ingredient({ food, left, full, onAdd }: IngredientProps) {
  const url = iconUrl(`food_${food.id}`);
  return (
    <button
      type="button"
      class="panel__item panel__item--row"
      disabled={left <= 0 || full}
      onClick={() => onAdd(food.id as PotItem)}
    >
      {url ? <img src={url} width={32} height={32} alt="" /> : null}
      <span class="panel__text">
        <span>{t(`food_${food.id}`)}</span>
        <small class="panel__count">{countLabel(left)}</small>
      </span>
    </button>
  );
}

/** The pot (4 slots and the cook button) above the ingredients that can go in it. */
export function CookTab({ pantry, pot, onPot, onCook }: Props) {
  const [listRef, more] = useScrollCue<HTMLDivElement>();
  const left = (item: PotItem) =>
    Math.max(0, stockOf(pantry, item) - pot.filter((p) => p === item).length);
  return (
    <>
      <PotRow
        pot={pot}
        onRemove={(index) => onPot(pot.filter((_, i) => i !== index))}
        onCook={onCook}
      />
      <div class="panel__list">
        <div
          class="panel__grid panel__grid--food panel__grid--cook"
          ref={listRef}
        >
          {POT_FOODS.map((f) => (
            <Ingredient
              key={f.id}
              food={f}
              left={left(f.id as PotItem)}
              full={pot.length >= POT_MAX}
              onAdd={(item) => onPot([...pot, item])}
            />
          ))}
        </div>
        {more && <MoreCue listRef={listRef} />}
      </div>
    </>
  );
}
