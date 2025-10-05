import fs from 'node:fs';
import path from 'node:path';
import ttf2woff2 from 'ttf2woff2';

const root = path.resolve(process.cwd());
const ttfPath = path.join(root, 'public', 'fonts', 'CloisterBlack.ttf');
const woff2Path = path.join(root, 'public', 'fonts', 'CloisterBlack.woff2');

function ensureFileExists(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`Input font not found: ${p}`);
  }
}

function convert() {
  ensureFileExists(ttfPath);
  const input = fs.readFileSync(ttfPath);
  const out = ttf2woff2(input);
  fs.writeFileSync(woff2Path, out);
  console.log(`Created: ${path.relative(root, woff2Path)}`);
}

try {
  convert();
} catch (err) {
  console.error('Font conversion failed:', err?.message || err);
  process.exitCode = 1;
}

