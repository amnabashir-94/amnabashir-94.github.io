/**
 * Generate the placeholder images the layout fixture (`data/sample/profile.yaml`) names.
 *
 * Why generated rather than committed: the fixture exists to preview the layout before real
 * work arrives and to document the data format, and neither needs binary files living forever
 * in a public repository under Amna's name. These are drawn from SVG with a seeded random
 * generator, so every run produces the same pictures, and each is stamped "SAMPLE" so none can
 * be mistaken for her work. Output goes to `src/assets/sample/`, which is git-ignored.
 *
 * Usage: `npx tsx scripts/make-sample-images.ts` — `scripts/sample.mjs` runs it when needed.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import { parse } from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const FIXTURE = resolve(ROOT, 'data/sample/profile.yaml');
const OUT = resolve(ROOT, 'src/assets/sample');

type Kind = 'render' | 'photo' | 'model' | 'sketch' | 'drawing' | 'diagram' | 'sheet';

/** Deterministic PRNG (mulberry32), so the fixture's images are identical on every machine. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable numeric seed from a string. */
function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const STAMP = (w: number, h: number, dark: boolean): string =>
  `<text x="${w - 36}" y="${h - 32}" text-anchor="end" font-family="Consolas, monospace" font-size="26" letter-spacing="4" fill="${dark ? '#ffffffb0' : '#00000080'}">SAMPLE IMAGE</text>`;

/** An eye-level render: sky, ground, a few masses with shaded sides and window grids. */
function render(r: () => number, w: number, h: number, photo: boolean): string {
  const horizon = h * (0.62 + r() * 0.08);
  const brick = ['#b5653f', '#a65a36', '#c27a52'];
  const concrete = ['#c9c4bb', '#b8b2a8', '#d8d3ca'];
  const palette = r() > 0.5 ? brick : concrete;
  let shapes = '';
  let x = w * 0.08;
  while (x < w * 0.9) {
    const bw = w * (0.12 + r() * 0.18);
    const bh = h * (0.18 + r() * 0.32);
    const depth = bw * 0.28;
    const face = palette[Math.floor(r() * palette.length)];
    shapes += `<polygon points="${x + bw},${horizon - bh} ${x + bw + depth},${horizon - bh - depth * 0.4} ${x + bw + depth},${horizon - depth * 0.4} ${x + bw},${horizon}" fill="${face}" opacity="0.65"/>`;
    shapes += `<polygon points="${x},${horizon - bh} ${x + depth},${horizon - bh - depth * 0.4} ${x + bw + depth},${horizon - bh - depth * 0.4} ${x + bw},${horizon - bh}" fill="#ffffff" opacity="0.35"/>`;
    shapes += `<rect x="${x}" y="${horizon - bh}" width="${bw}" height="${bh}" fill="${face}"/>`;
    const cols = Math.max(2, Math.floor(bw / 70));
    const rows = Math.max(1, Math.floor(bh / 90));
    for (let c = 0; c < cols; c++) {
      for (let k = 0; k < rows; k++) {
        const ww = (bw / cols) * 0.45;
        const wh = (bh / rows) * 0.45;
        shapes += `<rect x="${x + (c + 0.28) * (bw / cols)}" y="${horizon - bh + (k + 0.3) * (bh / rows)}" width="${ww}" height="${wh}" fill="#2b3640" opacity="0.75"/>`;
      }
    }
    x += bw + w * (0.02 + r() * 0.05);
  }
  let trees = '';
  for (let i = 0; i < 5; i++) {
    const tx = r() * w;
    const ts = 40 + r() * 70;
    trees += `<circle cx="${tx}" cy="${horizon - ts * 0.6}" r="${ts}" fill="#5f7350" opacity="0.85"/><rect x="${tx - 5}" y="${horizon - ts * 0.4}" width="10" height="${ts * 0.4}" fill="#4a3b2c"/>`;
  }
  const sky = photo ? ['#9fb8c9', '#e8eef0'] : ['#e9e3d8', '#f7f4ee'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <rect y="${horizon}" width="${w}" height="${h - horizon}" fill="${photo ? '#8f8a7f' : '#cfc8bb'}"/>
    ${shapes}${trees}
    <rect y="${horizon}" width="${w}" height="${(h - horizon) * 0.25}" fill="#00000018"/>
    ${STAMP(w, h, photo)}
  </svg>`;
}

/** A plan, section or elevation in black line on white, with grid bubbles and a title. */
function drawing(r: () => number, w: number, h: number, label: string): string {
  const m = 140;
  const ix = m;
  const iy = m;
  const iw = w - 2 * m;
  const ih = h - 2 * m - 80;
  let lines = `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="none" stroke="#111" stroke-width="10"/>`;
  const vx = [0.3 + r() * 0.1, 0.6 + r() * 0.1].map((f) => ix + iw * f);
  const hy = [0.45 + r() * 0.15].map((f) => iy + ih * f);
  for (const x of vx)
    lines += `<line x1="${x}" y1="${iy}" x2="${x}" y2="${iy + ih}" stroke="#111" stroke-width="6"/>`;
  for (const y of hy)
    lines += `<line x1="${ix}" y1="${y}" x2="${ix + iw}" y2="${y}" stroke="#111" stroke-width="6"/>`;
  // Door swings.
  for (const x of vx) {
    const y = hy[0]! + 10;
    lines += `<path d="M ${x} ${y} A 70 70 0 0 1 ${x + 70} ${y + 70}" fill="none" stroke="#111" stroke-width="2"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y + 70}" stroke="#fff" stroke-width="8"/>`;
  }
  // Structural grid and bubbles.
  const gridX = [ix, ...vx, ix + iw];
  gridX.forEach((x, i) => {
    lines += `<line x1="${x}" y1="${iy - 90}" x2="${x}" y2="${iy + ih + 30}" stroke="#999" stroke-width="1.5" stroke-dasharray="18 8 4 8"/><circle cx="${x}" cy="${iy - 110}" r="24" fill="#fff" stroke="#111" stroke-width="2"/><text x="${x}" y="${iy - 101}" text-anchor="middle" font-family="Arial" font-size="24">${String.fromCharCode(65 + i)}</text>`;
  });
  // Dimension line.
  lines += `<line x1="${ix}" y1="${iy + ih + 60}" x2="${ix + iw}" y2="${iy + ih + 60}" stroke="#111" stroke-width="1.5"/><text x="${ix + iw / 2}" y="${iy + ih + 52}" text-anchor="middle" font-family="Arial" font-size="22">00 000</text>`;
  // Hatched room.
  lines += `<defs><pattern id="hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="16" stroke="#bbb" stroke-width="2"/></pattern></defs><rect x="${vx[1]! + 5}" y="${iy + 5}" width="${ix + iw - vx[1]! - 10}" height="${hy[0]! - iy - 10}" fill="url(#hatch)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="#ffffff"/>
    ${lines}
    <text x="${m}" y="${h - 60}" font-family="Arial" font-size="30" letter-spacing="3">${label.toUpperCase()}</text>
    <text x="${m}" y="${h - 28}" font-family="Arial" font-size="20" fill="#666">SCALE 1:100</text>
    ${STAMP(w, h, false)}
  </svg>`;
}

/** A white massing model on a grey board. */
function model(r: () => number, w: number, h: number): string {
  let boxes = '';
  for (let i = 0; i < 7; i++) {
    const x = w * (0.15 + r() * 0.6);
    const y = h * (0.35 + r() * 0.35);
    const s = 80 + r() * 160;
    const t = 60 + r() * 220;
    boxes += `<polygon points="${x},${y} ${x + s},${y - s * 0.5} ${x + s},${y - s * 0.5 - t} ${x},${y - t}" fill="#f4f4f2"/><polygon points="${x},${y} ${x - s * 0.8},${y - s * 0.4} ${x - s * 0.8},${y - s * 0.4 - t} ${x},${y - t}" fill="#dcdcd8"/><polygon points="${x},${y - t} ${x + s},${y - s * 0.5 - t} ${x + s * 0.2},${y - s * 0.9 - t} ${x - s * 0.8},${y - s * 0.4 - t}" fill="#ffffff"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#6f6e6a"/><ellipse cx="${w / 2}" cy="${h * 0.62}" rx="${w * 0.42}" ry="${h * 0.22}" fill="#8a8984"/>${boxes}${STAMP(w, h, true)}</svg>`;
}

/** A zoning diagram: coloured zones, labels, and circulation arrows. */
function diagram(r: () => number, w: number, h: number): string {
  const colours = ['#9a4a2b', '#c9a227', '#5f7350', '#3d6b8c'];
  const labels = ['PUBLIC', 'SERVICE', 'GARDEN', 'PRIVATE'];
  let zones = '';
  colours.forEach((c, i) => {
    const x = 160 + (i % 2) * (w / 2 - 120) + r() * 40;
    const y = 160 + Math.floor(i / 2) * (h / 2 - 120) + r() * 40;
    zones += `<rect x="${x}" y="${y}" width="${w / 2 - 260}" height="${h / 2 - 240}" fill="${c}" opacity="0.8"/><text x="${x + 30}" y="${y + 60}" font-family="Arial" font-size="40" font-weight="bold" fill="#fff">${labels[i]}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><marker id="a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#111"/></marker></defs><rect width="${w}" height="${h}" fill="#fff"/>${zones}<path d="M ${w * 0.2} ${h * 0.5} C ${w * 0.4} ${h * 0.3}, ${w * 0.6} ${h * 0.7}, ${w * 0.8} ${h * 0.5}" fill="none" stroke="#111" stroke-width="8" marker-end="url(#a)"/>${STAMP(w, h, false)}</svg>`;
}

/** A loose graphite sketch on paper. */
function sketch(r: () => number, w: number, h: number): string {
  let strokes = '';
  for (let i = 0; i < 70; i++) {
    const x = r() * w;
    const y = h * 0.2 + r() * h * 0.6;
    const len = 80 + r() * 400;
    const vertical = r() > 0.6;
    const pts: string[] = [];
    for (let k = 0; k <= 6; k++) {
      const f = k / 6;
      pts.push(
        vertical
          ? `${x + (r() - 0.5) * 6},${y + f * len * 0.5}`
          : `${x + f * len},${y + (r() - 0.5) * 6}`,
      );
    }
    strokes += `<polyline points="${pts.join(' ')}" fill="none" stroke="#3a3a38" stroke-width="${1 + r() * 2.5}" opacity="${0.4 + r() * 0.5}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#f3efe6"/>${strokes}${STAMP(w, h, false)}</svg>`;
}

function svgFor(kind: Kind, seed: string, caption: string): { svg: string; png: boolean } {
  const r = rng(hash(seed));
  switch (kind) {
    case 'render':
      return { svg: render(r, 2000, 1333, false), png: false };
    case 'photo':
      return { svg: render(r, 2000, 1333, true), png: false };
    case 'model':
      return { svg: model(r, 2000, 1333), png: false };
    case 'sketch':
      return { svg: sketch(r, 2000, 1414), png: false };
    case 'diagram':
      return { svg: diagram(r, 2000, 1414), png: true };
    case 'drawing':
    case 'sheet':
      return { svg: drawing(r, 2000, 1414, caption), png: true };
  }
}

interface FixtureImage {
  file: string;
  kind: Kind;
  caption?: string;
}

async function main(): Promise<void> {
  const fixture = parse(readFileSync(FIXTURE, 'utf8')) as {
    projects: Array<{ id: string; images?: FixtureImage[] }>;
  };
  let count = 0;
  for (const project of fixture.projects) {
    const dir = resolve(OUT, project.id);
    mkdirSync(dir, { recursive: true });
    for (const image of project.images ?? []) {
      const { svg, png } = svgFor(
        image.kind,
        `${project.id}/${image.file}`,
        image.caption ?? image.kind,
      );
      const pipeline = sharp(Buffer.from(svg));
      const out = resolve(dir, image.file);
      // Respect the extension the fixture names, so the check that files exist means something.
      if (image.file.endsWith('.png')) await pipeline.png({ compressionLevel: 9 }).toFile(out);
      else await pipeline.jpeg({ quality: png ? 90 : 82, mozjpeg: true }).toFile(out);
      count++;
    }
  }
  console.log(`  ${count} sample images written to src/assets/sample/`);
}

await main();
