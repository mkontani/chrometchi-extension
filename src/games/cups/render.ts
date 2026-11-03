import { drawCounter } from '../hud';
import { gameArt as art } from '../art';
import { drawSprite } from '../sprites';
import { cupPosition, ROUNDS, type CupsState } from './logic';

const SIZE = 180;
const SLOT_W = 60;
const CUP_W = 40;
const CUP_H = 44;
const CUP_Y = 80;
const LIFT = 22;
const TREAT = 16;
const CUP_ART = 32;
const TREAT_COLOR = '#ffd84a';
const CUP_COLOR = '#8a5a2b';

/** A 32px cup sprite sits at the bottom centre of the cup's 40×44 hit box. */
function drawCup(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const img = art.get('cup');
  const box = img
    ? { x: x + (CUP_W - CUP_ART) / 2, y: y + CUP_H - CUP_ART, w: CUP_ART, h: CUP_ART }
    : { x, y, w: CUP_W, h: CUP_H };
  drawSprite(ctx, img, box, CUP_COLOR);
}

/** Cups and the treat use pixel sprites once loaded, flat boxes until then. */
export function renderCups(ctx: CanvasRenderingContext2D, s: CupsState): void {
  ctx.fillStyle = '#fff4e0';
  ctx.fillRect(0, 0, SIZE, SIZE);
  const treatSlot = s.slotOf[s.treatCup] ?? 0;
  const showTreat = s.phase === 'show' || s.phase === 'reveal';
  s.slotOf.forEach((slot, cup) => {
    const lifted = showTreat && cup === s.treatCup;
    const pos = cupPosition(s, cup);
    if (lifted) {
      const treat = { x: slot * SLOT_W + (SLOT_W - TREAT) / 2, y: CUP_Y + CUP_H - TREAT, w: TREAT, h: TREAT };
      drawSprite(ctx, art.get('treat'), treat, TREAT_COLOR);
    }
    drawCup(ctx, pos.x, lifted ? pos.y - LIFT : pos.y);
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
