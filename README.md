# Chrometchi

A pixel-art virtual pet that lives in your Chrome toolbar. Hatch an egg, raise it through
its life stages, and discover every form it can grow into.

![Keep a tiny pet in your browser](screenshots/en/store_1.png)

| | |
| --- | --- |
| ![Care](screenshots/en/store_2.png) | ![Mini-games](screenshots/en/store_3.png) |
| ![Evolution](screenshots/en/store_4.png) | ![Night](screenshots/en/store_5.png) |

Japanese versions are in [`screenshots/ja`](screenshots/ja).

## Features

- **Branching evolution** across five stages. How you care for your pet decides what it becomes, and some forms are secret.
- **Care**: meals and treats, mini-games (Catch, Cups, Stop), cleaning up, medicine, lights out, and petting.
- **Time only runs while Chrome is open.** Your pet sleeps at night (configurable) and needs the lights off.
- **Warnings before death**: notifications and an in-popup banner tell you when life is in danger.
- **Zukan**: a collection of every form you have discovered, plus memories of past pets.
- **Walks on web pages** (optional): your pet strolls along the bottom of the pages you browse. Click it to hear how it is doing, drag it aside, or hide it on a site. Site access is asked for only when you turn this on.
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
| `npm run screenshots` | Regenerate the store screenshots in `screenshots/{ja,en}` |

Before the first e2e run: `npx playwright install chromium`.

## Credits

Pixel art generated with PixelLab.
