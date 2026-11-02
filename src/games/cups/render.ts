import { drawCounter } from '../hud';
import { cupPosition, ROUNDS, type CupsState } from './logic';

const SIZE = 180;
const SLOT_W = 60;
const CUP_W = 40;
const CUP_H = 44;
const CUP_Y = 80;
const LIFT = 22;
const TREAT = 14;
const TREAT_COLOR = '#ffd84a';
const CUP_COLOR = '#8a5a2b';

/** Placeholder pixel shapes; Plan 2 swaps in sprites. */
export function renderCups(ctx: CanvasRenderingContext2D, s: CupsState): void {
  ctx.fillStyle = '#fff4e0';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const treatSlot = s.slotOf[s.treatCup] ?? 0;
  const showTreat = s.phase === 'show' || s.phase === 'reveal';
  s.slotOf.forEach((slot, cup) => {
    const lifted = showTreat && cup === s.treatCup;
    const pos = cupPosition(s, cup);
    if (lifted) {
      ctx.fillStyle = TREAT_COLOR;
      ctx.fillRect(slot * SLOT_W + (SLOT_W - TREAT) / 2, CUP_Y + CUP_H - TREAT, TREAT, TREAT);
    }
    ctx.fillStyle = CUP_COLOR;
    ctx.fillRect(pos.x, lifted ? pos.y - LIFT : pos.y, CUP_W, CUP_H);
  });
  if (s.phase === 'pick') {
    ctx.strokeStyle = '#ff7aa2';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.cursor * SLOT_W + 4, CUP_Y - 4, SLOT_W - 8, CUP_H + 8);
  }
  if (s.phase === 'reveal' && s.chosen !== null) {
    ctx.fillStyle = s.chosen === treatSlot ? '#3cb371' : '#d9534f';
    ctx.fillRect(s.chosen * SLOT_W + SLOT_W / 2 - 4, CUP_Y + CUP_H + 8, 8, 8);
  }
  drawCounter(ctx, 4, CUP_COLOR, `${Math.min(s.round + 1, ROUNDS)}/${ROUNDS}`);
  drawCounter(ctx, 64, TREAT_COLOR, `×${s.correct}`);
}
