import { INK, THEMES, px, titleLine } from './compose';
import { PROMO_COPY, type Lang } from './copy';

/**
 * Store promo tiles as HTML, served like the slides (see compose.ts). The marquee shows the real
 * popup (/shot.png) opening from the toolbar of a drawn browser; the small tile shows a collection
 * card. Sprites are drawn at whole or half multiples of their 32px art.
 */
export const PROMOS = { marquee: { width: 1400, height: 560 }, small: { width: 440, height: 280 } } as const;
export type PromoKind = keyof typeof PROMOS;

const C = THEMES.pink;
const LINEUP = ['adult_dragon', 'adult_unicorn', 'adult_owl', 'adult_kraken', 'adult_pudding'] as const;
/** The small tile's collection card; null is a form the player has not met yet. */
const CARD = ['adult_dragon', 'adult_unicorn', null, 'adult_kraken', 'adult_owl', 'adult_pudding'] as const;
const UNMET_FORM = 'adult_phoenix';
const GROWTH = ['egg/plain', 'baby_puni', 'child_hoshi'] as const;

const sprite = (form: string, size: number): string => px(`sprites/${form}/idle0.png`, size);
const unmet = (size: number): string => `<div class="unmet">${sprite(UNMET_FORM, size)}<b>?</b></div>`;
const lines = (ls: readonly string[]): string => ls.map(titleLine).join('<br>');
const brand = (size: number): string =>
  `<div class="abs brand"><img class="px" src="/icon/48.png" width="${size}" height="${size}" alt="">Chrometchi</div>`;
const deco = (effect: string, css: string): string => px(`ui/effects/${effect}.png`, 56, 'px abs', css);

function baseCss(kind: PromoKind): string {
  const { width, height } = PROMOS[kind];
  return `*{box-sizing:border-box}
  body{margin:0;width:${width}px;height:${height}px;overflow:hidden;position:relative;
    font-family:'DotGothic16',sans-serif;color:${C.text};background-color:${C.bg};
    background-image:radial-gradient(${C.dot} 2.5px,transparent 3px);background-size:28px 28px}
  .px{image-rendering:pixelated;display:block}
  .abs{position:absolute}
  mark{color:inherit;background:linear-gradient(transparent 58%,${C.mark} 58%)}
  .brand{display:flex;align-items:center;gap:12px}
  .card{background:#fff;border:4px solid ${INK};border-radius:16px;box-shadow:8px 8px 0 ${INK}}
  .unmet{position:relative}
  .unmet img{filter:brightness(0) opacity(.85)}
  .unmet b{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-weight:400}`;
}

const MARQUEE_CSS = `
  .blob{left:640px;top:-120px;width:1460px;height:1460px;border-radius:50%;background:${C.blob}}
  .copy{left:80px;top:0;bottom:0;width:600px;display:flex;flex-direction:column;justify-content:center;gap:20px}
  .copy .brand{position:static;font-size:30px}
  h1{margin:0;font-weight:400;font-size:62px;line-height:1.2;white-space:nowrap}
  .sub{margin:0;font-size:26px;line-height:1.5;color:${C.sub};white-space:nowrap}
  .lineup{display:flex;gap:4px;margin-top:6px}
  .lineup .unmet b{font-size:36px}
  .browser{left:700px;top:56px;width:640px;height:560px;overflow:hidden;border-radius:14px}
  .tabs{height:40px;background:#f6d3dd;display:flex;align-items:flex-end;padding-left:14px}
  .tab{width:180px;height:32px;background:#fff;border-radius:10px 10px 0 0;display:flex;align-items:center;
    gap:8px;padding:0 10px}
  .favicon{width:14px;height:14px;border-radius:50%;background:#bfe8d2}
  .tabtitle{height:8px;width:90px;border-radius:4px;background:#e8dbe2}
  .toolbar{height:48px;display:flex;align-items:center;gap:12px;padding:0 14px;border-bottom:3px solid #f0e4ea}
  .nav{color:#b9a9b6;font-size:20px}
  .omnibox{flex:1;height:28px;border-radius:14px;background:#f5eef2}
  .other{width:22px;height:22px;border-radius:5px;background:#e8dbe2}
  .ours{width:36px;height:36px;border-radius:50%;background:${C.mark};display:grid;place-items:center}
  .page{padding:24px;display:grid;gap:14px;grid-template-columns:1fr 1fr}
  .text{height:14px;border-radius:7px;background:#f1e8ed}
  .block{grid-column:span 2;height:110px;border-radius:12px;background:#f7f0f4}
  .popup{right:6px;top:84px;width:336px;border:4px solid ${INK};border-radius:12px;overflow:hidden;
    box-shadow:8px 8px 0 ${INK};background:${C.blob};line-height:0}
  .popup img{width:328px;height:auto}`;

function browser(): string {
  const text = ['70%', '95%', '60%', '85%', '75%', '50%'].map((w) => `<i class="text" style="width:${w}"></i>`);
  return `<div class="abs card browser">
    <div class="tabs"><div class="tab"><i class="favicon"></i><i class="tabtitle"></i></div></div>
    <div class="toolbar"><span class="nav">◀ ▶</span><i class="omnibox"></i><i class="other"></i>
      <span class="ours"><img class="px" src="/icon/16.png" width="32" height="32" alt=""></span></div>
    <div class="page">${text.join('')}<i class="block"></i></div>
    <div class="abs popup"><img src="/shot.png" alt=""></div>
  </div>`;
}

function marquee(lang: Lang): string {
  const { title, sub } = PROMO_COPY.marquee;
  const lineup = [...LINEUP.map((f) => sprite(f, 96)), unmet(96)].join('');
  return `<div class="abs blob"></div>
  <section class="abs copy">
    ${brand(48)}
    <h1>${lines(title[lang])}</h1>
    <p class="sub">${lines(sub[lang])}</p>
    <div class="lineup">${lineup}</div>
  </section>
  ${browser()}
  ${deco('sparkle', 'left:640px;top:40px')}${deco('note', 'left:1320px;top:470px')}`;
}

const smallCss = (lang: Lang): string => `
  .brand{left:22px;top:18px;font-size:30px}
  .tagline{left:22px;top:78px;margin:0;font-size:${lang === 'ja' ? 26 : 22}px;line-height:1.4;white-space:nowrap}
  .growth{left:24px;top:196px;display:flex;align-items:center;gap:4px}
  .growth span{color:#8f7fa0;font-size:16px}
  .collection{right:16px;top:126px;padding:8px;transform:rotate(-2deg)}
  .grid{display:grid;grid-template-columns:repeat(3,56px);gap:5px}
  .cell{height:56px;background:${C.blob};border-radius:10px;display:grid;place-items:center}
  .cell .unmet b{font-size:20px}`;

function small(lang: Lang): string {
  const cells = CARD.map((f) => `<div class="cell">${f ? sprite(f, 48) : unmet(48)}</div>`).join('');
  const growth = GROWTH.map((f) => sprite(f, 48)).join('<span>▸</span>');
  return `${brand(40)}
  <p class="abs tagline">${lines(PROMO_COPY.small.tagline[lang])}</p>
  <div class="abs growth">${growth}</div>
  <div class="abs card collection"><div class="grid">${cells}</div></div>`;
}

export function promoHtml(kind: PromoKind, lang: Lang): string {
  const css = baseCss(kind) + (kind === 'marquee' ? MARQUEE_CSS : smallCss(lang));
  const body = kind === 'marquee' ? marquee(lang) : small(lang);
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
  <link rel="stylesheet" href="/font/index.css"><style>${css}</style></head><body>${body}</body></html>`;
}
