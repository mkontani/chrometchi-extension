import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { bite } from './frames';
import { readPng } from './lib';

const USAGE = 'usage: tsx scripts/art/bite.ts <1|2> <food.png> <out.png>\n';
/** The palette's outline color (#000000), as in every sprite's 1px outline. */
const OUTLINE = [0, 0, 0] as const;

function main(argv: string[]): number {
  const [count, input, out] = argv;
  const bites = count === '1' ? 1 : count === '2' ? 2 : null;
  const png = input ? readPng(input) : null;
  if (!bites || !png || !out) {
    process.stdout.write(USAGE);
    return 1;
  }
  const frame = bite(png, bites, OUTLINE);
  const encoded = new PNG({ width: frame.width, height: frame.height });
  encoded.data.set(frame.data);
  writeFileSync(out, PNG.sync.write(encoded));
  return 0;
}

process.exitCode = main(process.argv.slice(2));
