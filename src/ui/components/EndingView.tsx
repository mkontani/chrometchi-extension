import type { PetState } from '@/core/types';
import { t } from '@/i18n/t';
import { effectUrl, spriteUrl } from '@/ui/assets';

function Emblem({ pet }: { pet: PetState }) {
  if (pet.lifecycle === 'departed') {
    return <img class="ending__img" src={spriteUrl(pet.formId, 'happy')} width={128} height={128} alt="" />;
  }
  const skull = effectUrl('skull');
  return skull ? (
    <img class="ending__img grave" src={skull} width={96} height={96} alt="" />
  ) : (
    <div class="ending__img grave grave--placeholder" aria-hidden="true" />
  );
}

export function EndingView({ pet, onNewEgg }: { pet: PetState; onNewEgg(): void }) {
  const title = t(pet.lifecycle === 'dead' ? 'ending_dead_title' : 'ending_departed_title');
  const path = pet.path.map((id) => t(`form_${id}`)).join(' → ');
  return (
    <section class="overlay ending">
      <Emblem pet={pet} />
      <h2>{title}</h2>
      <p>{t('ending_summary', [String(Math.floor(pet.awakeMinutes / 60)), path])}</p>
      <button type="button" class="dialog__btn" onClick={onNewEgg}>
        {t('new_egg')}
      </button>
    </section>
  );
}
