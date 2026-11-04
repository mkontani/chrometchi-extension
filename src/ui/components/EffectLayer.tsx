import { cookUrl, effectUrl, foodUrl, iconUrl } from '@/ui/assets';
import type { Prop, PropArt } from '@/ui/effects/types';

/** The art's own size in px, before `scale`. */
const ART_PX: Readonly<Record<PropArt['kind'], number>> = { food: 32, effect: 16, icon: 16, cook: 32 };

function propUrl(art: PropArt): string | null {
  switch (art.kind) {
    case 'food':
      return foodUrl(art.food, art.bites);
    case 'effect':
      return effectUrl(art.id);
    case 'icon':
      return iconUrl(art.id);
    case 'cook':
      return cookUrl(art.id);
  }
}

interface Props {
  props: readonly Prop[];
  flash: boolean;
}

/** The pictures of a care effect, placed on the stage, plus its flash. */
export function EffectLayer({ props, flash }: Props) {
  return (
    <>
      {props.map((p) => {
        const url = propUrl(p.art);
        if (!url) return null;
        const size = ART_PX[p.art.kind] * p.scale;
        return (
          <img
            key={p.key}
            class={`fx-prop fx-prop--${p.art.kind}`}
            src={url}
            width={size}
            height={size}
            alt=""
            style={`left: ${p.x}px; top: ${p.y}px`}
          />
        );
      })}
      {flash && <div class="stage__flash" />}
    </>
  );
}
