import { readFileSync } from 'node:fs';
import { checkImage } from './lib';

const USAGE = 'usage: tsx scripts/art/check.ts [--size 32x32] [--palette] [--opaque] <files...>\n';
const PALETTE_PATH = 'src/assets/palette.json';

function parseSize(s: string): { width: number; height: number } {
  const m = /^(\d+)x(\d+)$/.exec(s);
  if (!m) throw new Error(`invalid --size "${s}" (expected WxH)`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

function parseArgs(argv: string[]) {
  const files: string[] = [];
  let size = { width: 32, height: 32 };
  let usePalette = false;
  let opaque = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--size') size = parseSize(argv[++i] ?? '');
    else if (a === '--palette') usePalette = true;
    else if (a === '--opaque') opaque = true;
    else if (a === '--help' || a === '-h') return null;
    else if (a !== undefined) files.push(a);
  }
  return { files, size, usePalette, opaque };
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  if (!args || args.files.length === 0) {
    process.stdout.write(USAGE);
    return args ? 1 : 0;
  }
  const palette: string[] | undefined = args.usePalette
    ? (JSON.parse(readFileSync(PALETTE_PATH, 'utf8')) as string[])
    : undefined;
  const issues = args.files.flatMap((f) =>
    checkImage(f, { ...args.size, palette, transparentCorners: !args.opaque }),
  );
  for (const i of issues) process.stdout.write(`${i.file}: ${i.kind}: ${i.detail}\n`);
  return issues.length > 0 ? 1 : 0;
}

try {
  process.exitCode = main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 2;
}
