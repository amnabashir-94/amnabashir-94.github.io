/**
 * Validate the profile, check its images, and report every claim not yet verified.
 *
 * Three jobs, and the last is the important one:
 *
 *  1. **Schema.** Malformed data fails here, with the path of each problem.
 *  2. **Images.** Every file the profile names must exist in its project folder, and must be
 *     web-sized — an architect's originals run to tens of megabytes, and one committed by
 *     accident bloats a public repository forever. Files nobody names are reported too, since
 *     an unreferenced image is usually a typo in the profile.
 *  3. **Gaps.** An unverified fact produces no error, no red build and no artifact, so without a
 *     standing report it simply ages into looking like settled fact. Printing the list on every
 *     run is what stops that. So is listing what will *not* be published, and why.
 *
 * Exit code is non-zero for schema and image failures only. Outstanding gaps are expected while
 * content is being gathered and must not block work; they are surfaced, not enforced.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { ZodError } from 'zod';

import { projectImageDir } from '../src/lib/files';
import { collectGaps } from '../src/lib/gaps';
import { isPublishable, loadProfile, PROFILE_PATH, PROJECT_ROOT } from '../src/lib/profile';
import type { Profile } from '../src/schema/profile';

/** Above this, an image is an original, not a web copy. `npm run images` makes web copies. */
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

const IMAGE_FILE = /\.(jpg|jpeg|png|webp|avif)$/i;

function loadOrExit(): Profile {
  try {
    return loadProfile();
  } catch (error) {
    if (error instanceof ZodError) {
      console.error(`\n${PROFILE_PATH} failed validation:\n`);
      for (const issue of error.issues) {
        console.error(`  ${issue.path.join('.') || '(root)'}\n    ${issue.message}`);
      }
      console.error(
        '\nNote: `state: assumed` is rejected outright on years, areas, results, registration\n' +
          'numbers and clearance. Those may only be `verified` or `missing` — never inferred.\n',
      );
      process.exit(1);
    }
    throw error;
  }
}

/** Check every named image exists and is web-sized; report unnamed files. Returns error count. */
function checkImages(profile: Profile): number {
  let errors = 0;
  for (const project of profile.projects) {
    const dir = resolve(PROJECT_ROOT, projectImageDir(profile, project.id));
    const named = new Set(project.images.map((image) => image.file));
    for (const file of named) {
      const full = resolve(dir, file);
      if (!existsSync(full)) {
        console.error(`  IMAGE MISSING  ${projectImageDir(profile, project.id)}/${file}`);
        errors++;
        continue;
      }
      const bytes = statSync(full).size;
      if (bytes > MAX_IMAGE_BYTES) {
        console.error(
          `  IMAGE TOO BIG  ${projectImageDir(profile, project.id)}/${file} — ` +
            `${(bytes / 1024 / 1024).toFixed(1)} MB; run \`npm run images\` to make a web copy`,
        );
        errors++;
      }
    }
    if (existsSync(dir)) {
      for (const file of readdirSync(dir).filter((f) => IMAGE_FILE.test(f) && !named.has(f))) {
        console.log(`  unreferenced   ${projectImageDir(profile, project.id)}/${file}`);
      }
    }
  }
  return errors;
}

function main(): void {
  const profile = loadOrExit();
  const imageErrors = checkImages(profile);

  const gaps = collectGaps(profile);
  const assumed = gaps.filter((g) => g.state === 'assumed');
  const missing = gaps.filter((g) => g.state === 'missing');
  const withheld = profile.projects.filter((project) => !isPublishable(project));

  console.log(
    `\n${PROFILE_PATH.replace(/\\/g, '/').split('/').slice(-2).join('/')} is valid — ` +
      `${profile.projects.length} projects (${profile.projects.length - withheld.length} publishable), ` +
      `${profile.experience.length} roles, ${profile.variants.length} CV variant(s).` +
      (profile.sample ? '  [SAMPLE FIXTURE]' : ''),
  );

  if (withheld.length) {
    console.log(`\n  NOT PUBLISHED (${withheld.length}) — validated, but on no page, PDF or CV:`);
    for (const project of withheld) {
      const why = project.draft ? 'draft' : 'professional work without verified clearance';
      console.log(`    ${project.id} — ${why}`);
    }
  }

  if (assumed.length) {
    console.log(`\n  ASSUMED (${assumed.length}) — inferred, ships, confirm when you can:`);
    for (const g of assumed)
      console.log(`    ${g.path} = ${JSON.stringify(g.value)}\n      ${g.basis ?? '(no basis)'}`);
  }

  if (missing.length) {
    console.log(`\n  MISSING (${missing.length}) — omitted from every artifact until supplied:`);
    for (const g of missing) console.log(`    ${g.path}\n      ${g.basis ?? '(no note)'}`);
  }

  if (!assumed.length && !missing.length)
    console.log('\n  No outstanding claims. Every fact is verified.');
  console.log(
    '\n  private/intake.md turns this list into questions — `npm run intake` regenerates it.\n',
  );

  if (imageErrors) {
    console.error(`${imageErrors} image problem(s) — see above.\n`);
    process.exit(1);
  }
}

main();
