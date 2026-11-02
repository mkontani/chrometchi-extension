import { useEffect, useState } from 'preact/hooks';
import type { PetState, Pose } from '@/core/types';
import { deriveWarning } from '@/core/warnings';
import { t } from '@/i18n/t';
import { backgroundUrl, effectUrl, spriteUrl, type EffectId } from '@/ui/assets';

export type Reaction = 'eat' | 'happy' | null;
const IDLE_INTERVAL_MS = 500;

interface Props {
  pet: PetState;
  reaction: Reaction;
  /** true when the happy reaction comes from playing (shows notes) */
  fromPlay?: boolean;
}

export function choosePose(pet: PetState, reaction: Reaction, frame: 0 | 1): Pose {
  if (reaction) return reaction;
  if (pet.asleep) return 'sleep';
  if (pet.sick) return 'sick';
  const w = deriveWarning(pet);
  if (w === 'danger' || w === 'critical') return 'sad';
  return frame === 0 ? 'idle0' : 'idle1';
}

function useIdleFrame(): 0 | 1 {
  const [frame, setFrame] = useState<0 | 1>(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), IDLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  return frame;
}

function Effect({ id, cls }: { id: EffectId; cls: string }) {
  const url = effectUrl(id);
  return url ? <img class={`effect ${cls}`} src={url} alt="" /> : null;
}

function Poops({ count }: { count: number }) {
  const url = effectUrl('poop');
  return (
    <div class="poops">
      {Array.from({ length: count }, (_, i) =>
        url ? (
          <img key={i} class="poop" src={url} width={32} height={32} alt="" />
        ) : (
          <span key={i} class="poop poop--placeholder" />
        ),
      )}
    </div>
  );
}

export function PetStage({ pet, reaction, fromPlay = false }: Props) {
  const frame = useIdleFrame();
  const bg = backgroundUrl(pet.asleep ? 'room_night' : 'room_day');
  const bgClass = pet.asleep ? 'stage--night' : 'stage--day';
  const style = bg ? { backgroundImage: `url(${bg})` } : undefined;
  const pose = choosePose(pet, reaction, frame);
  return (
    <section class={`stage ${bgClass}`} style={style}>
      <img
        class={`pet ${pose.startsWith('idle') ? 'pet--bounce' : ''}`}
        src={spriteUrl(pet.formId, pose)}
        width={128}
        height={128}
        alt={t(`form_${pet.formId}`)}
      />
      <Poops count={pet.poops} />
      {pet.asleep && <Effect id="zzz" cls="effect--zzz" />}
      {pet.sick && <Effect id="sweat" cls="effect--sweat" />}
      {reaction === 'happy' && <Effect id="sparkle" cls="effect--sparkle" />}
      {reaction === 'happy' && fromPlay && <Effect id="note" cls="effect--note" />}
    </section>
  );
}
