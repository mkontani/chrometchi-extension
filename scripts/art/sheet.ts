import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buildSheet, type SheetGroup } from './lib';

const USAGE =
  'usage: tsx scripts/art/sheet.ts --title "<question>" --out <dir>/<name>.html --group "<label>" <files...> [--group ...]\n';

function parseArgs(argv: string[]) {
  let title = '';
  let out = '';
  const groups: SheetGroup[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? '';
    const last = groups[groups.length - 1];
    if (a === '--title') title = argv[++i] ?? '';
    else if (a === '--out') out = argv[++i] ?? '';
    else if (a === '--group') groups.push({ label: argv[++i] ?? '', files: [] });
    else if (last) last.files.push(a);
    else throw new Error(`file "${a}" given before any --group`);
  }
  return { title, out, groups };
}

function main(): number {
  const { title, out, groups } = parseArgs(process.argv.slice(2));
  if (!out || groups.length === 0) {
    process.stdout.write(USAGE);
    return 1;
  }
  const { html, copies } = buildSheet(title, groups);
  const dir = dirname(out);
  mkdirSync(dir, { recursive: true });
  for (const c of copies) copyFileSync(c.from, join(dir, c.name));
  writeFileSync(out, html);
  process.stdout.write(`wrote ${out} (${copies.length} images)\n`);
  return 0;
}

try {
  process.exitCode = main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 2;
}
