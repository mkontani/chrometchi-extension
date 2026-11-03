import type { Lang, Slide, Theme, Visual } from './copy';

/**
 * Builds one 1280×800 store image as HTML. Asset URLs are served by the spec's route handler:
 * /font/ (DotGothic16), /art/ (src/assets), /icon/ (public/icon) and /shot.png (the popup).
 * The popup capture is taken at 3× and shown at 1.5×, so pixel art stays crisp.
 */
export const STORE = { width: 1280, height: 800 } as const;
export const POPUP = { width: 360, height: 462, captureScale: 3, showScale: 1.5 } as const;

const INK = '#2b2233';
const THEMES: Record<Theme, { bg: string; dot: string; blob: string; text: string; sub: string; mark: string }> = {
  pink: { bg: '#ffe3ea', dot: '#ffc9d6', blob: '#fff4e0', text: INK, sub: '#5b4d66', mark: '#ffb0c5' },
  mint: { bg: '#dcf4e7', dot: '#bfe8d2', blob: '#fff4e0', text: INK, sub: '#4a5a52', mark: '#9fe0bd' },
  yellow: { bg: '#fff0c4', dot: '#ffe08f', blob: '#fff9ea', text: INK, sub: '#5f5340', mark: '#ffd25e' },
  lavender: { bg: '#ebe3ff', dot: '#d8c9ff', blob: '#fff4e0', text: INK, sub: '#55497a', mark: '#c9b3ff' },
  night: { bg: '#1f255c', dot: '#2d3577', blob: '#2a3170', text: '#fff4e0', sub: '#cfd2f5', mark: '#6a5bd6' },
};

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const px = (src: string, size: number, cls = 'px', css = ''): string =>
  `<img class="${cls}" src="/art/${src}" width="${size}" height="${size}" alt="" style="${css}">`;

/** "[word]" in a headline line becomes a highlighted span. */
function titleLine(line: string): string {
  return esc(line).replace(/\[(.+?)\]/g, '<mark>$1</mark>');
}

function growth(steps: Extract<Visual, { kind: 'growth' }>['steps'], lang: Lang): string {
  const cells = steps.map((s) => `<div class="step">${px(s.sprite, 96)}<span>${esc(s.label[lang])}</span></div>`);
  return `<div class="card growth">${cells.join('')}</div>`;
}

function chips(items: Extract<Visual, { kind: 'chips' }>['items'], lang: Lang): string {
  const rows = items.map((i) => `<li>${px(`ui/icons/${i.icon}.png`, 64)}<span>${esc(i.text[lang])}</span></li>`);
  return `<ul class="card chips">${rows.join('')}</ul>`;
}

function branch(v: Extract<Visual, { kind: 'branch' }>, lang: Lang): string {
  const adults = v.to.map((f) => px(`sprites/${f}/idle0.png`, 96));
  const secret = `<div class="secret">${px(`sprites/${v.secret}/idle0.png`, 96)}<b>?</b></div>`;
  return `<div class="card branch"><div class="tree">${px(`sprites/${v.from}/idle0.png`, 96)}
    <span class="arrow">▶</span><div class="grid">${adults.join('')}${secret}</div></div>
    <p>${esc(v.note[lang])}</p></div>`;
}

function visual(v: Visual, lang: Lang): string {
  if (v.kind === 'growth') return growth(v.steps, lang);
  if (v.kind === 'chips') return chips(v.items, lang);
  return branch(v, lang);
}

const DECO_SPOTS = ['left:612px;top:58px', 'left:1176px;top:654px'];

function style(theme: Theme, lang: Lang): string {
  const c = THEMES[theme];
  const w = POPUP.width * POPUP.showScale;
  const h = POPUP.height * POPUP.showScale;
  return `
  *{box-sizing:border-box}
  body{margin:0;width:${STORE.width}px;height:${STORE.height}px;overflow:hidden;position:relative;
    font-family:'DotGothic16',sans-serif;color:${c.text};background-color:${c.bg};
    background-image:radial-gradient(${c.dot} 2.5px,transparent 3px);background-size:28px 28px}
  .px{image-rendering:pixelated;display:block}
  .blob{position:absolute;width:760px;height:760px;border-radius:50%;left:560px;top:20px;background:${c.blob}}
  .copy{position:absolute;left:72px;top:0;bottom:0;width:540px;display:flex;flex-direction:column;
    justify-content:center;gap:22px}
  .brand{display:flex;align-items:center;gap:12px;font-size:28px}
  h1{margin:0;font-weight:400;font-size:${lang === 'ja' ? 60 : 52}px;line-height:1.22;white-space:nowrap}
  mark{color:inherit;background:linear-gradient(transparent 58%,${c.mark} 58%)}
  .sub{margin:0;font-size:24px;line-height:1.6;color:${c.sub};word-break:${lang === 'ja' ? 'keep-all' : 'normal'};
    overflow-wrap:anywhere;text-wrap:pretty}
  .card{margin:0;background:#fff;color:${INK};border:4px solid ${INK};border-radius:16px;
    box-shadow:8px 8px 0 ${INK};padding:16px 18px}
  .growth{display:grid;grid-template-columns:repeat(5,1fr)}
  .step{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:18px}
  .step+.step::before{content:'▸';position:absolute;left:-11px;top:36px;font-size:22px;color:#8f7fa0}
  .chips{list-style:none;display:flex;flex-direction:column;gap:2px;padding:12px 18px}
  .chips li{display:flex;align-items:center;gap:14px;font-size:22px}
  .branch{display:flex;flex-direction:column;align-items:center;gap:8px}
  .tree{display:flex;align-items:center;gap:14px}
  .arrow{font-size:28px;color:#8f7fa0}
  .grid{display:flex;gap:8px}
  .secret{position:relative}
  .secret img{filter:brightness(0) opacity(.85)}
  .secret b{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:34px;font-weight:400}
  .branch p{margin:0;font-size:19px;color:#5b4d66}
  .popup{position:absolute;right:80px;top:50%;transform:translateY(-50%);border:6px solid ${INK};
    border-radius:20px;box-shadow:14px 14px 0 ${INK};overflow:hidden;line-height:0;background:#fff4e0}
  .popup img{width:${w}px;height:${h}px}
  .deco{position:absolute}`;
}

export function composeHtml(slide: Slide, lang: Lang): string {
  const title = slide.title[lang].map(titleLine).join('<br>');
  const deco = slide.deco.map((d, i) => px(`ui/effects/${d}.png`, 64, 'px deco', DECO_SPOTS[i] ?? ''));
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
  <link rel="stylesheet" href="/font/index.css"><style>${style(slide.theme, lang)}</style></head><body>
  <div class="blob"></div>
  <section class="copy">
    <div class="brand"><img class="px" src="/icon/128.png" width="48" height="48" alt="">Chrometchi</div>
    <h1>${title}</h1>
    <p class="sub">${esc(slide.sub[lang]).replace(/\n/g, '<br>')}</p>
    ${visual(slide.visual, lang)}
  </section>
  <div class="popup"><img src="/shot.png" alt=""></div>
  ${deco.join('')}
  </body></html>`;
}
