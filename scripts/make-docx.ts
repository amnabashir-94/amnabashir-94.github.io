/**
 * Convert each generated Markdown CV to DOCX via pandoc.
 *
 * DOCX is the machine-facing artifact deliberately: Word files parse reliably across every major
 * applicant-tracking system, including older installs where PDF extraction is weakest. The PDF
 * carries the visual design for the human reader; this file optimises purely for being read
 * correctly by a machine.
 *
 * Two flags carry most of the safety:
 *
 * - `markdown-pipe_tables…` disables table parsing on input entirely. Role meta lines such as
 *   "Example Studio | Lahore | Apr 2024" are full of pipes, and a table is the single most
 *   reliable way to make a CV parse to nothing. Removing the possibility beats reasoning about it.
 * - `--reference-doc` pins pandoc's stock styles: one column, real Heading 1/2/3, nothing in the
 *   header or footer. Regenerate it with
 *   `pandoc -o assets/cv/reference.docx --print-default-data-file reference.docx`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { loadProfile, PROJECT_ROOT } from '../src/lib/profile';
import { artifactDirs } from '../src/lib/files';

const REFERENCE = resolve(PROJECT_ROOT, 'assets/cv/reference.docx');

function main(): void {
  const dirs = artifactDirs(loadProfile());
  const inDir = resolve(PROJECT_ROOT, dirs.cvMarkdown);
  const outDir = resolve(PROJECT_ROOT, dirs.cv);
  mkdirSync(outDir, { recursive: true });

  const files = existsSync(inDir) ? readdirSync(inDir).filter((f) => f.endsWith('.md')) : [];
  if (!files.length) {
    console.error(`No CVs in ${dirs.cvMarkdown}/. Run \`npm run cv:build\` first.`);
    process.exit(1);
  }
  for (const file of files) {
    const out = join(outDir, file.replace(/\.md$/, '.docx'));
    execFileSync(
      'pandoc',
      [
        join(inDir, file),
        '--from',
        'markdown-pipe_tables-grid_tables-simple_tables-smart',
        '--to',
        'docx',
        '--reference-doc',
        REFERENCE,
        '--output',
        out,
      ],
      { stdio: 'inherit' },
    );
    console.log(`  ${file}  ->  ${dirs.cv}/${file.replace(/\.md$/, '.docx')}`);
  }
  console.log(`\n${files.length} DOCX file(s) written to ${dirs.cv}/\n`);
}

main();
