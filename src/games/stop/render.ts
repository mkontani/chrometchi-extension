import type { StopState } from './logic';

const SIZE = 180;
const BAR_X = 10;
const BAR_W = 160;
const BAR_Y = 80;
const BAR_H = 20;
const MARK_W = 4;

function drawMark(ctx: CanvasRenderingContext2D, hit: boolean): void {
  ctx.strokeStyle = hit ? '#3cb371' : '#d9534f';
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (hit) {
    ctx.moveTo(80, 140);
    ctx.lineTo(90, 152);
    ctx.lineTo(108, 128);
  } else {
    ctx.moveTo(80, 126);
    ctx.lineTo(104, 152);
    ctx.moveTo(104, 126);
    ctx.lineTo(80, 152);
  }
  ctx.stroke();
}

/** Placeholder pixel shapes; Plan 2 swaps in sprites. */
export function renderStop(ctx: CanvasRenderingContext2D, s: StopState): void {
  ctx.fillStyle = '#fff4e0';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#d8c9b0';
  ctx.fillRect(BAR_X, BAR_Y, BAR_W, BAR_H);
  ctx.fillStyle = '#3cb371';
  ctx.fillRect(BAR_X + (s.center - s.width / 2) * BAR_W, BAR_Y, s.width * BAR_W, BAR_H);
  ctx.fillStyle = '#2b2233';
  ctx.fillRect(BAR_X + s.pos * BAR_W - MARK_W / 2, BAR_Y - 6, MARK_W, BAR_H + 12);
  if (s.phase !== 'run') drawMark(ctx, s.lastHit);
  ctx.font = '10px monospace';
  ctx.fillText(`${Math.min(s.tryIndex + 1, 5)}/5  ok ${s.hits}`, 4, SIZE - 4);
}
