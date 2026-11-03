import { useEffect, useRef } from 'preact/hooks';
import type { RefObject } from 'preact';
import { NO_INPUT, type GameInput } from '@/games/types';

export const LOGICAL_SIZE = 180;

const KEYS: Readonly<Record<string, 'left' | 'right' | 'action'>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ' ': 'action',
  Space: 'action',
};

/** Tap position in logical coordinates, measured from the canvas content box; null outside it. */
export function toLogical(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const r = canvas.getBoundingClientRect();
  const w = r.width - 2 * canvas.clientLeft;
  const h = r.height - 2 * canvas.clientTop;
  const px = clientX - r.left - canvas.clientLeft;
  const py = clientY - r.top - canvas.clientTop;
  if (w <= 0 || h <= 0 || px < 0 || py < 0 || px >= w || py >= h) return null;
  return { x: (px / w) * LOGICAL_SIZE, y: (py / h) * LOGICAL_SIZE };
}

/** Collects key/pointer events between frames; `take()` returns and clears them. */
export function useGameInput(
  canvasRef: RefObject<HTMLCanvasElement>,
  pickFromPointer: ((x: number, y: number) => number | null) | undefined,
): () => GameInput {
  const pending = useRef<GameInput>({ ...NO_INPUT });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onKey = (e: KeyboardEvent) => {
      const k = KEYS[e.key] ?? KEYS[e.code];
      if (!k) return;
      e.preventDefault();
      if (!e.repeat) pending.current = { ...pending.current, [k]: true };
    };
    const onPointer = (e: PointerEvent) => {
      const pos = toLogical(canvas, e.clientX, e.clientY);
      const pick = pos ? (pickFromPointer?.(pos.x, pos.y) ?? null) : null;
      if (pick !== null) pending.current = { ...pending.current, pick };
    };
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onPointer);
    };
  }, [canvasRef, pickFromPointer]);
  return () => {
    const input = pending.current;
    pending.current = { ...NO_INPUT };
    return input;
  };
}
