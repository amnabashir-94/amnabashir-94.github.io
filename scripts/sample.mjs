/**
 * Run Astro against the layout fixture instead of the real profile.
 *
 *   node scripts/sample.mjs dev      (npm run dev:sample)
 *   node scripts/sample.mjs build    (npm run build:sample — then check-dist, sample allowed)
 *
 * Sets `PROFILE_FILE` for the loader and `ALLOW_SAMPLE` for check-dist, generates the fixture's
 * images if they are missing, then hands over to Astro. A launcher rather than inline env vars
 * in package.json because `VAR=x cmd` does not work in the shell npm uses on Windows, and a
 * dependency just to set two variables is not worth carrying.
 *
 * Astro is spawned through its `.mjs` entry with this Node binary: Node 24 refuses to spawn a
 * `.cmd` shim without a shell, and turning the shell on reintroduces argument-escaping bugs.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, PROFILE_FILE: 'data/sample/profile.yaml', ALLOW_SAMPLE: '1' };
const node = process.execPath;

/** Run a step and exit with its status if it fails, so a broken step is never papered over. */
function run(args) {
  const result = spawnSync(node, args, { cwd: ROOT, env, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const tsx = resolve(ROOT, 'node_modules/tsx/dist/cli.mjs');
const astro = resolve(ROOT, 'node_modules/astro/bin/astro.mjs');

if (!existsSync(resolve(ROOT, 'src/assets/sample'))) {
  run([tsx, 'scripts/make-sample-images.ts']);
}

const [command = 'dev', ...rest] = process.argv.slice(2);
run([astro, command, ...rest]);
if (command === 'build') run([tsx, 'scripts/check-dist.ts']);
