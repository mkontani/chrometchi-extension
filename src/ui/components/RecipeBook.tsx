import type { DishId } from '@/core/types';
import { POT_ITEMS, RECIPES, type RecipeDef } from '@/data/recipes';
import { t } from '@/i18n/t';
import { iconUrl } from '@/ui/assets';

/** `Meat×2`, `Veggies×1`: the recipe's ingredients in pot order. */
function ingredients(def: RecipeDef): string {
  return POT_ITEMS.filter((item) => (def.items[item] ?? 0) > 0)
    .map((item) => `${t(`food_${item}`)}×${def.items[item]}`)
    .join(t('recipe_join'));
}

function Row({ def, found }: { def: RecipeDef; found: boolean }) {
  const url = found ? iconUrl(`food_${def.id}`) : null;
  return (
    <li class="recipes__row">
      {url ? <img src={url} width={32} height={32} alt="" /> : <span class="recipes__unknown-icon">?</span>}
      <span class="recipes__text">
        <span class="recipes__name">{found ? t(`food_${def.id}`) : t('recipe_unknown')}</span>
        <small class="recipes__detail">{found ? ingredients(def) : t(`recipe_hint_${def.id}`)}</small>
      </span>
    </li>
  );
}

export function RecipeBook({ recipes }: { recipes: readonly DishId[] }) {
  const found = new Set<string>(recipes);
  const count = RECIPES.filter((r) => found.has(r.id)).length;
  return (
    <div class="recipes">
      <p class="zukan__count">{t('recipes_count', [String(count), String(RECIPES.length)])}</p>
      <ul class="recipes__list">
        {RECIPES.map((def) => (
          <Row key={def.id} def={def} found={found.has(def.id)} />
        ))}
      </ul>
    </div>
  );
}
