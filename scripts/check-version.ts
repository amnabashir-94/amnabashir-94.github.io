/**
 * Check that the version is declared once: `package.json`, `package-lock.json` and the top
 * released entry of `CHANGELOG.md` must agree.
 *
 * The 0.2.0 release bumped `package.json` and the changelog by hand and left the lock file at
 * 0.1.0, unnoticed for a cycle. `npm version <x.y.z> --no-git-tag-version` updates both JSON
 * files together; this check catches a bump made any other way, and a changelog left behind.
 *
 * Usage: `tsx scripts/check-version.ts [root]`. `root` defaults to this repository; it exists so
 * the check can be run against another checkout, which is how it was proven.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The fields of `package.json` and `package-lock.json` this check reads. */
interface PackageFile {
  version?: string;
  packages?: Record<string, { version?: string }>;
}

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('..', import.meta.url)));

function readPackageFile(file: string): PackageFile {
  return JSON.parse(readFileSync(resolve(root, file), 'utf8')) as PackageFile;
}

const pkg = readPackageFile('package.json');
const lock = readPackageFile('package-lock.json');
// The first heading with a version number; an `## [Unreleased]` section above it is allowed.
const changelogTop = /^## \[(\d+\.\d+\.\d+)\]/m.exec(
  readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8'),
)?.[1];

const declared: [where: string, version: string | undefined][] = [
  ['package.json', pkg.version],
  ['package-lock.json', lock.version],
  ['package-lock.json packages[""]', lock.packages?.['']?.version],
  ['CHANGELOG.md top entry', changelogTop],
];

const expected = pkg.version;
const disagreeing = declared.filter(([, version]) => version === undefined || version !== expected);

if (expected === undefined || disagreeing.length > 0) {
  console.error('\ncheck-version: the version is not declared consistently:\n');
  for (const [where, version] of declared)
    console.error(`  ${where.padEnd(32)} ${version ?? '(none)'}`);
  console.error(
    '\nBump with `npm version <x.y.z> --no-git-tag-version` (updates both JSON files), then add\n' +
      'the matching `## [x.y.z]` entry at the top of CHANGELOG.md.\n',
  );
  process.exit(1);
}

console.log(`check-version: ${expected} in package.json, package-lock.json and CHANGELOG.md.`);
