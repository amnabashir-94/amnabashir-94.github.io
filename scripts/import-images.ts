/**
 * Make web copies of a project's original images and print the profile entries for them.
 *
 *   npm run images -- "<folder of originals>" <project-id>
 *
 * Why a step at all: an architect's originals are 10–50 MB renders and scans, and a public git
 * repository keeps every byte it is ever given. This writes copies at most 2400 px on the long
 * edge into `src/assets/projects/<project-id>/` — enough for a full-width figure and the PDF —
 * and `check-profile` fails on anything larger, so an original cannot slip in by accident.
 *
 * Two quieter jobs:
 *
 * - **Metadata is stripped.** Photographs from a phone carry GPS coordinates; a site photo of a
 *   client's house would otherwise publish where the client lives.
 * - **Orientation is applied**, so a photo taken in portrait does not appear on its side.
 *
 * PNG stays PNG (line drawings survive it far better than JPEG); everything else becomes JPEG.
 * The printed YAML has empty `alt` text on purpose: the schema rejects it until someone writes
 * what each image shows, so placeholder descriptions can never ship.
 *
 * Drawings that exist only as PDF sheets need exporting to PNG first (any PDF viewer, or
 * `pdftoppm -png -r 200`); sharp does not read PDF.
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';

import sharp from 'sharp';

// Not `profile.ts`: it locates data/profile.yaml on import, and this runs before that file exists.
import { projectImageDir } from '../src/lib/files';

const LONG_EDGE = 2400;
const SOURCE = /\.(jpe?g|png|tiff?|webp)$/i;
const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** `IMG 0042 (final).JPG` → `img-0042-final`. Lower-case kebab, as the schema requires. */
function slug(name: string): string {
  return name
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main(): Promise<void> {
  const [source, projectId] = process.argv.slice(2);
  if (!source || !projectId || !ID.test(projectId)) {
    console.error(
      'Usage: npm run images -- "<folder of originals>" <project-id>   (project-id in kebab-case)',
    );
    process.exit(1);
  }
  if (!existsSync(source)) {
    console.error(`No such folder: ${source}`);
    process.exit(1);
  }

  // Imports are always for real projects — the fixture's images are generated — so the folder
  // is fixed rather than read from a profile that may not exist yet.
  const relativeDir = projectImageDir({ sample: false }, projectId);
  const outDir = resolve(process.cwd(), relativeDir);
  mkdirSync(outDir, { recursive: true });

  const files = readdirSync(source)
    .filter((f) => SOURCE.test(f))
    .sort();
  if (!files.length) {
    console.error(`No .jpg, .png, .tif or .webp files in ${source}`);
    process.exit(1);
  }

  const entries: string[] = [];
  for (const file of files) {
    const isPng = extname(file).toLowerCase() === '.png';
    const name = `${slug(basename(file, extname(file)))}.${isPng ? 'png' : 'jpg'}`;
    const pipeline = sharp(join(source, file))
      .rotate()
      .resize({ width: LONG_EDGE, height: LONG_EDGE, fit: 'inside', withoutEnlargement: true });
    const info = isPng
      ? await pipeline.png({ compressionLevel: 9 }).toFile(join(outDir, name))
      : await pipeline.jpeg({ quality: 84, mozjpeg: true }).toFile(join(outDir, name));
    console.log(
      `  ${file}  ->  ${relativeDir}/${name}  (${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} KB)`,
    );
    entries.push(
      [
        `      - file: ${name}`,
        `        kind: ${isPng ? 'drawing' : 'render'}   # render | photo | model | sketch | drawing | diagram | sheet`,
        `        alt: ''   # what the image shows, for someone who cannot see it`,
        `        caption: ${basename(file, extname(file))}`,
      ].join('\n'),
    );
  }

  console.log(
    `\nPaste under the project's \`images:\` in data/profile.yaml, then fill each alt:\n`,
  );
  console.log(entries.join('\n'));
  console.log('');
}

await main();
