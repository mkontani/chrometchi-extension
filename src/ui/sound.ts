import { useRef } from 'preact/hooks';

export type SfxName = 'select' | 'eat' | 'happy' | 'win' | 'lose' | 'alert' | 'sweep' | 'gulp' | 'click' | 'get' | 'simmer' | 'cooked';

interface Sequence {
  readonly notes: readonly number[]; // Hz; 0 is a rest
  readonly noteSec: number;
}

const SEQUENCES: Readonly<Record<SfxName, Sequence>> = {
  select: { notes: [880], noteSec: 0.06 },
  eat: { notes: [523, 659], noteSec: 0.08 },
  happy: { notes: [659, 784, 1046], noteSec: 0.08 },
  win: { notes: [523, 659, 784, 1046], noteSec: 0.09 },
  lose: { notes: [440, 330], noteSec: 0.15 },
  alert: { notes: [988, 0, 988], noteSec: 0.1 },
  sweep: { notes: [330, 262], noteSec: 0.05 },
  gulp: { notes: [392, 262], noteSec: 0.07 },
  click: { notes: [1318], noteSec: 0.03 },
  get: { notes: [784, 1047], noteSec: 0.06 },
  simmer: { notes: [262, 294, 262, 294], noteSec: 0.07 },
  cooked: { notes: [659, 784, 988, 1319], noteSec: 0.08 },
};

const PEAK_GAIN = 0.05;
const FLOOR_GAIN = 0.0001;

function playNote(ctx: AudioContext, freq: number, at: number, dur: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(PEAK_GAIN, at);
  gain.gain.exponentialRampToValueAtTime(FLOOR_GAIN, at + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur);
}

function playSequence(ctx: AudioContext, seq: Sequence): void {
  const base = ctx.currentTime;
  seq.notes.forEach((freq, i) => {
    if (freq > 0) playNote(ctx, freq, base + i * seq.noteSec, seq.noteSec);
  });
}

const warn = (err: unknown) => console.warn('[chrometchi] sfx', err);

export function createSfx(
  enabled: () => boolean,
  makeContext: () => AudioContext,
): { play(name: SfxName): void } {
  let ctx: AudioContext | null = null;
  return {
    play(name) {
      if (!enabled()) return;
      try {
        ctx ??= makeContext();
        if (ctx.state === 'suspended') void ctx.resume().catch(warn);
        playSequence(ctx, SEQUENCES[name]);
      } catch (err) {
        warn(err);
      }
    },
  };
}

/** Stable sfx player that reads the latest `soundEnabled` at play time. */
export function useSfx(soundEnabled: boolean): { play(name: SfxName): void } {
  const enabledRef = useRef(soundEnabled);
  enabledRef.current = soundEnabled;
  const sfxRef = useRef<{ play(name: SfxName): void } | null>(null);
  sfxRef.current ??= createSfx(
    () => enabledRef.current,
    () => new AudioContext(),
  );
  return sfxRef.current;
}
