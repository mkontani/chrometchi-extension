import { useEffect, useState } from 'preact/hooks';
import type { PetState, Pose } from '@/core/types';
import { deriveWarning } from '@/core/warnings';
import { t } from '@/i18n/t';
import { backgroundUrl, effectUrl, spriteUrl, type EffectId } from '@/ui/assets';
import { PET } from '@/ui/effects/layout';
import type { EffectFrame, PoopView } from '@/ui/effects/types';
import { EffectLayer } from './EffectLayer';

export type Reaction = 'eat' | 'happy' | null;
const IDLE_INTERVAL_MS = 500;

interface Props {
  pet: PetState;
  /** picks the egg's shell pattern */
  generation: number;
  reaction: Reaction;
  /** true when the happy reaction comes from playing (shows notes) */
  fromPlay?: boolean;
  /** The running care effect's frame, drawn over the usual picture. */
  effect?: EffectFrame | null;
  onPetClick?(): void;
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

const WAITING: PoopView = { look: 'poop', dx: 0 };

function PoopSlot({ view }: { view: PoopView }) {
  if (view.look === 'gone') return <span class="poop poop--gone" />;
  const url = effectUrl(view.look);
  const style = view.dx ? `transform: translateX(${view.dx}px)` : undefined;
  return url ? (
    <img class="poop" src={url} width={32} height={32} alt="" style={style} />
  ) : (
    <span class="poop poop--placeholder" style={style} />
  );
}

/** The saved poops, or the effect's view of them while the broom works. */
function Poops({ count, views }: { count: number; views: readonly PoopView[] | null }) {
  const list = views ?? Array.from({ length: count }, () => WAITING);
  return (
    <div class="poops">
      {list.map((view, i) => (
        <PoopSlot key={i} view={view} />
      ))}
    </div>
  );
}

const STAR_COUNT = 3;

/** The dark room's look: darkness from the edges in, and twinkling stars once fully dark. */
function Darkness({ level }: { level: number }) {
  if (level <= 0) return null;
  const star = effectUrl('star');
  return (
    <>
      <div class="stage__dim" style={`--dim: ${level}`} />
      {level >= 1 &&
        star &&
        Array.from({ length: STAR_COUNT }, (_, i) => (
          <img key={i} class={`effect effect--star effect--star-${i}`} src={star} alt="" />
        ))}
    </>
  );
}

export function PetStage({ pet, generation, reaction, fromPlay = false, effect = null, onPetClick }: Props) {
  const frame = useIdleFrame();
  const bg = backgroundUrl(pet.asleep ? 'room_night' : 'room_day');
  const bgClass = pet.asleep ? 'stage--night' : 'stage--day';
  const style = bg ? { backgroundImage: `url(${bg})` } : undefined;
  const pose = effect?.pose ?? choosePose(pet, reaction, frame);
  const darkness = effect?.dim ?? (pet.asleep && !pet.lightsOn ? 1 : 0);
  const formName = t(`form_${pet.formId}`);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPetClick?.();
    }
  };
  return (
    <section class={`stage ${bgClass}${darkness >= 1 ? ' stage--dark' : ''}`} style={style}>
      <img
        class={`pet ${pose.startsWith('idle') ? 'pet--bounce' : ''}`}
        src={spriteUrl(pet.formId, pose, generation)}
        width={128}
        height={128}
        alt={formName}
        role="button"
        tabIndex={0}
        aria-label={`${t('action_pet')}: ${formName}`}
        style={effect?.petDx ? `left: ${PET.x + effect.petDx}px` : undefined}
        onClick={onPetClick}
        onKeyDown={onKeyDown}
      />
      <Poops count={pet.poops} views={effect?.poops ?? null} />
      {pet.asleep && <Effect id="zzz" cls="effect--zzz" />}
      {pet.sick && <Effect id="sweat" cls="effect--sweat" />}
      {reaction === 'happy' && <Effect id="sparkle" cls="effect--sparkle" />}
      <Darkness level={darkness} />
      {reaction === 'happy' && fromPlay && <Effect id="note" cls="effect--note" />}
      {effect && <EffectLayer props={effect.props} flash={effect.flash} />}
    </section>
  );
}
