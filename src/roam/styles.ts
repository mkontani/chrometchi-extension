/** Shadow-DOM styles for the roaming pet. `all: initial` keeps the page's CSS out. */
export const ROAM_STYLES = `
:host { all: initial; }
.mover { position: absolute; left: 0; bottom: 0; width: 64px; height: 64px; }
.pet {
  pointer-events: auto; display: block; width: 64px; height: 64px; margin: 0; padding: 0;
  border: 0; background: none; cursor: grab; touch-action: none;
}
.pet:focus-visible { outline: 2px dashed #2b2233; outline-offset: 2px; }
.pet img { display: block; width: 64px; height: 64px; image-rendering: pixelated; pointer-events: none; }
.shadow {
  position: absolute; left: 14px; width: 36px; height: 6px; border-radius: 50%;
  background: rgba(43, 34, 51, 0.25); pointer-events: none;
}
.shadow[hidden] { display: none; }
.bubble {
  pointer-events: auto; position: absolute; bottom: 72px; width: 200px; box-sizing: border-box;
  padding: 8px 10px; background: #fff4e0; color: #2b2233; border: 3px solid #2b2233;
  box-shadow: 3px 3px 0 #2b2233; font: 13px/1.4 system-ui, sans-serif;
}
.bubble[hidden] { display: none; }
.say { margin: 0 0 6px; }
.hide {
  font: inherit; font-size: 12px; padding: 2px 8px; border: 2px solid #2b2233;
  background: #ffd6e0; color: #2b2233; cursor: pointer;
}
`;
