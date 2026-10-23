/**
 * Write one Markdown CV per variant — the intermediate pandoc turns into DOCX.
 *
 * Markdown is an intermediate, not a deliverable: pandoc turns it into a DOCX whose structure
 * is what an applicant-tracking system parses well — one column, real heading styles, no tables
 * and nothing stranded in a header. A hand-maintained Word file drifts from that with the first
 * formatting tweak; a generated one cannot.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadProfile, PROJECT_ROOT } from '../src/lib/profile';
import { renderCv } from '../src/lib/cv-markdown';
import { artifactDirs } from '../src/lib/files';

function main(): void {
  const profile = loadProfile();
  const outDir = resolve(PROJECT_ROOT, artifactDirs(profile).cvMarkdown);
  mkdirSync(outDir, { recursive: true });
  for (const variant of profile.variants) {
    writeFileSync(resolve(outDir, `${variant.filename}.md`), renderCv(profile, variant), 'utf8');
    console.log(`  ${variant.filename}.md  (${variant.label})`);
  }
  console.log(
    `\n${profile.variants.length} CV variant(s) written to ${artifactDirs(profile).cvMarkdown}/\n`,
  );
}

main();
