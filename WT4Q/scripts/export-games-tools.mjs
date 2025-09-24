// Node script to assemble a portable Games & Tools bundle under export/games-tools
// Run: node WT4Q/scripts/export-games-tools.mjs

import { promises as fs } from 'fs';
import path from 'path';

const repoRoot = path.resolve(process.cwd(), 'WT4Q');
const exportRoot = path.join(repoRoot, 'export', 'games-tools');

const entries = [
  { src: path.join(repoRoot, 'src', 'app', 'games'), dest: path.join(exportRoot, 'src', 'app', 'games') },
  { src: path.join(repoRoot, 'src', 'app', 'tools'), dest: path.join(exportRoot, 'src', 'app', 'tools') },
  { src: path.join(repoRoot, 'src', 'components', 'metrotrade'), dest: path.join(exportRoot, 'src', 'components', 'metrotrade') },
  { src: path.join(repoRoot, 'src', 'components', 'QrMaker.tsx'), dest: path.join(exportRoot, 'src', 'components', 'QrMaker.tsx') },
  { src: path.join(repoRoot, 'src', 'components', 'QrMaker.module.css'), dest: path.join(exportRoot, 'src', 'components', 'QrMaker.module.css') },
  { src: path.join(repoRoot, 'src', 'components', 'PrefetchLink.tsx'), dest: path.join(exportRoot, 'src', 'components', 'PrefetchLink.tsx') },
  { src: path.join(repoRoot, 'src', 'hooks', 'metrotrade'), dest: path.join(exportRoot, 'src', 'hooks', 'metrotrade') },
  { src: path.join(repoRoot, 'src', 'hooks', 'useMetroStore.ts'), dest: path.join(exportRoot, 'src', 'hooks', 'useMetroStore.ts') },
  { src: path.join(repoRoot, 'src', 'styles', 'metrotrade'), dest: path.join(exportRoot, 'src', 'styles', 'metrotrade') },
  { src: path.join(repoRoot, 'lib', 'metrotrade'), dest: path.join(exportRoot, 'lib', 'metrotrade') },
  { src: path.join(repoRoot, 'public', 'images', '2048.png'), dest: path.join(exportRoot, 'public', 'images', '2048.png') },
  { src: path.join(repoRoot, 'public', 'images', 'tetris.png'), dest: path.join(exportRoot, 'public', 'images', 'tetris.png') },
  { src: path.join(repoRoot, 'public', 'images', 'metrotrade.png'), dest: path.join(exportRoot, 'public', 'images', 'metrotrade.png') },
];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

async function copyDir(src, dest) {
  const stat = await fs.stat(src);
  if (!stat.isDirectory()) {
    return copyFile(src, dest);
  }
  await ensureDir(dest);
  const items = await fs.readdir(src);
  for (const item of items) {
    const s = path.join(src, item);
    const d = path.join(dest, item);
    const st = await fs.stat(s);
    if (st.isDirectory()) {
      await copyDir(s, d);
    } else {
      await copyFile(s, d);
    }
  }
}

async function main() {
  await ensureDir(exportRoot);
  for (const { src, dest } of entries) {
    try {
      await copyDir(src, dest);
      console.log(`Copied: ${path.relative(repoRoot, src)} -> ${path.relative(repoRoot, dest)}`);
    } catch (err) {
      console.warn(`Skip missing: ${path.relative(repoRoot, src)} (${err?.message || err})`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

