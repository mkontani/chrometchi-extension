import { loadSprite } from '@/games/sprites';
import type { OutingView } from '@/outings/types';
import { assetUrl, iconUrl, type IconId } from '@/ui/assets';

type ArtId = Parameters<OutingView['art']>[0];

const urlOf = (id: ArtId): string | null =>
  id.startsWith('food_') ? iconUrl(id as IconId) : assetUrl(`ui/outing/${id}`);

/** Looks outing art up by id, starting each load once; null while loading or missing. */
export function createOutingArt(): OutingView['art'] {
  const sprites = new Map<ArtId, () => CanvasImageSource | null>();
  return (id) => {
    let get = sprites.get(id);
    if (!get) {
      get = loadSprite(urlOf(id));
      sprites.set(id, get);
    }
    return get();
  };
}
