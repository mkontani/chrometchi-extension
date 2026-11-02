# Chrometchi

A pixel-art virtual pet that lives in your Chrome toolbar. Hatch an egg, raise it through
its life stages, and discover all 42 forms.

## Features

- **42 forms** across five stages. How you care for your pet decides what it becomes.
- **Care**: 6 foods, 3 mini-games (Catch, Cups, Stop), cleaning up, medicine, lights out, and petting.
- **Time only runs while Chrome is open.** Your pet sleeps at night (configurable) and needs the lights off.
- **Warnings before death**: notifications and an in-popup banner tell you when life is in danger.
- **Zukan**: a collection of every form you have discovered, plus memories of past pets.
- English and Japanese, optional chiptune sound effects (off by default).

## Install from source

```bash
npm ci
npm run build
```

Then open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select
`.output/chrome-mv3`.

## Development

Built with [WXT](https://wxt.dev), TypeScript and Preact.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start WXT dev mode with hot reload |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:coverage` | Unit tests with the 80% coverage gate |
| `npm run e2e` | Build and run Playwright extension tests |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type check |
| `npm run zip` | Package `.output/*-chrome.zip` for release |

Before the first e2e run: `npx playwright install chromium`.

## Credits

Pixel art generated with PixelLab.
