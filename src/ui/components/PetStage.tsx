import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { AccessoryId, DecorId, PetState, Pose, RoomId, SlotId, WearPlace } from '@/core/types';
import { accessoryDef } from '@/data/accessories';
import { FORM_ANCHORS, wornPoint } from '@/data/anchors';
import { decorDef } from '@/data/decor';
import { ROOM_SLOTS, SLOT_KIND } from '@/data/slots';
import { deriveWarning } from '@/core/warnings';
import { t } from '@/i18n/t';
import { accUrl, backgroundUrl, decorUrl, effectUrl, spriteUrl, type EffectId } from '@/ui/assets';
import { PET } from '@/ui/effects/layout';
import type { EffectFrame, PoopView } from '@/ui/effects/types';
import { EffectLayer } from './EffectLayer';

export interface PlacedDecor {
  slot: SlotId;
  decor: DecorId;
}

export type Reaction = 'eat' | 'happy' | null;
const IDLE_INTERVAL_MS = 500;

interface Props {
  pet: PetState;
  /** picks the egg's shell pattern */
  generation: number;
  /** the room drawn behind the pet */
  room: RoomId;
  reaction: Reaction;
  /** the furniture placed in this room, drawn in its slots */
  decor?: readonly PlacedDecor[];
  /** what the pet wears, drawn on the form's head, face and neck points */
  worn?: Partial<Record<WearPlace, AccessoryId>>;
  /** true when the happy reaction comes from playing (shows notes) */
  fromPlay?: boolean;
  /** The running care effect's frame, drawn over the usual picture. */
  effect?: EffectFrame | null;
  onPetClick?(): void;
  /** Drawn over everything else, e.g. the decorate screen's slot buttons. */
  children?: ComponentChildren;
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

const DECOR_SCALE = 2;

/** One furniture item at 2x: floor bottom-centred in its slot, ceiling top-centred, wall and rug centred. */
function Decor({ room, item, night }: { room: RoomId; item: PlacedDecor; night: boolean }) {
  const rect = ROOM_SLOTS[room][item.slot];
  const url = decorUrl(item.decor);
  if (!rect || !url) return null;
  const size = decorDef(item.decor).size * DECOR_SCALE;
  const kind = SLOT_KIND[item.slot];
  const left = rect.x + (rect.w - size) / 2;
  const top = kind === 'floor' ? rect.y + rect.h - size : kind === 'ceiling' ? rect.y : rect.y + (rect.h - size) / 2;
  return (
    <img
      class={`decor${night ? ' decor--night' : ''}`}
      src={url}
      alt=""
      style={{ left: `${left}px`, top: `${top}px`, width: `${size}px`, height: `${size}px` }}
    />
  );
}

const WORN_SCALE = 4;
/** Drawn after the pet, so neck sits under face, and face under head. */
const WORN_ORDER: readonly WearPlace[] = ['neck', 'face', 'head'];

interface WornProps {
  formId: PetState['formId'];
  place: WearPlace;
  id: AccessoryId;
  /** the pose the pet is drawn in, so the item follows the idle bounce frame */
  pose: Pose;
}

/** One worn item at 4x; its anchor lands on the form's point (positions are relative to the pet wrapper). */
function Worn({ formId, place, id, pose }: WornProps) {
  const anchors = FORM_ANCHORS[formId];
  const url = accUrl(id);
  if (!anchors || !url) return null;
  const point = wornPoint(anchors, place, pose);
  const def = accessoryDef(id);
  const size = def.size * WORN_SCALE;
  return (
    <img
      class="pet__worn"
      src={url}
      alt=""
      data-acc={id}
      style={{
        left: `${WORN_SCALE * (point[0] - def.anchor.x)}px`,
        top: `${WORN_SCALE * (point[1] - def.anchor.y)}px`,
        width: `${size}px`,
        height: `${size}px`,
      }}
    />
  );
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

export function PetStage({ pet, generation, room, reaction, decor = [], worn = {}, fromPlay = false, effect = null, onPetClick, children }: Props) {
  const frame = useIdleFrame();
  const bg = backgroundUrl(`${room}_${pet.asleep ? 'night' : 'day'}`);
  const bgClass = pet.asleep ? 'stage--night' : 'stage--day';
  const style = bg ? { backgroundImage: `url(${bg})` } : undefined;
  // A sleeping pet stays asleep: clean and medicine still play their props around it.
  const pose = (pet.asleep ? null : effect?.pose) ?? choosePose(pet, reaction, frame);
  const darkness = effect?.dim ?? (pet.asleep && !pet.lightsOn ? 1 : 0);
  const formName = t(`form_${pet.formId}`);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPetClick?.();
    }
  };
  const drawn = (front: boolean) =>
    decor
      .filter((item) => (SLOT_KIND[item.slot] === 'floor') === front)
      .map((item) => <Decor key={item.slot} room={room} item={item} night={pet.asleep} />);
  return (
    <section class={`stage ${bgClass}${darkness >= 1 ? ' stage--dark' : ''}`} style={style}>
      {drawn(false)}
      <div
        class={`pet ${pose.startsWith('idle') ? 'pet--bounce' : ''}`}
        style={effect?.petDx ? `left: ${PET.x + effect.petDx}px` : undefined}
      >
        <img
          class="pet__img"
          src={spriteUrl(pet.formId, pose, generation)}
          width={128}
          height={128}
          alt={formName}
          {...(onPetClick ? { role: 'button', tabIndex: 0, 'aria-label': `${t('action_pet')}: ${formName}` } : {})}
          onClick={onPetClick}
          onKeyDown={onKeyDown}
        />
        {WORN_ORDER.map((place) => {
          const id = worn[place];
          return id ? <Worn key={place} formId={pet.formId} place={place} id={id} pose={pose} /> : null;
        })}
      </div>
      {drawn(true)}
      <Poops count={pet.poops} views={effect?.poops ?? null} />
      {pet.asleep && <Effect id="zzz" cls="effect--zzz" />}
      {pet.sick && <Effect id="sweat" cls="effect--sweat" />}
      {reaction === 'happy' && <Effect id="sparkle" cls="effect--sparkle" />}
      <Darkness level={darkness} />
      {reaction === 'happy' && fromPlay && <Effect id="note" cls="effect--note" />}
      {effect && <EffectLayer props={effect.props} flash={effect.flash} />}
      {children}
    </section>
  );
}
