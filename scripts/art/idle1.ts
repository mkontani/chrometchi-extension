import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { nudge, squash } from './frames';
import { readPng } from './lib';

const USAGE = 'usage: tsx scripts/art/idle1.ts <squash|nudge> <idle0.png> <out.png>\n';

function main(argv: string[]): number {
  const [mode, input, out] = argv;
  const transform = mode === 'squash' ? squash : mode === 'nudge' ? nudge : null;
  const png = input ? readPng(input) : null;
  if (!transform || !png || !out) {
    process.stdout.write(USAGE);
    return 1;
  }
  const frame = transform(png);
  const encoded = new PNG({ width: frame.width, height: frame.height });
  encoded.data.set(frame.data);
  writeFileSync(out, PNG.sync.write(encoded));
  return 0;
}

process.exitCode = main(process.argv.slice(2));
