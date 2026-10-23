/**
 * Mechanically enforce the structural rules an applicant-tracking system actually cares about.
 *
 * What breaks CV parsing is layout, not file format: tables, multi-column blocks, text boxes,
 * content stranded in headers or footers, and inconsistent date formats that cause a role to be
 * dropped from an extracted work history. None of those are visible to the author — a document
 * that looks right can parse to nothing. So the rules are checked here rather than trusted.
 *
 * Section names come from `cv-markdown.ts`, the module that writes them, so the lint and the
 * renderer cannot drift apart on a heading.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { CV_SECTIONS } from '../src/lib/cv-markdown';
import { artifactDirs } from '../src/lib/files';
import { loadProfile, PROJECT_ROOT } from '../src/lib/profile';

const CV_DIR = resolve(PROJECT_ROOT, artifactDirs(loadProfile()).cvMarkdown);

/**
 * Sections a parser — and an architecture practice or scholarship panel — expects. Software is
 * required because architecture roles are screened on it first. Experience is not: a
 * graduate's first CV may honestly have none, and the schema allows that.
 */
const REQUIRED_SECTIONS = [CV_SECTIONS.education, CV_SECTIONS.software];

/** Every CV opens with a summary — professional or research — under a heading parsers know. */
const SUMMARY_SECTIONS: readonly string[] = [CV_SECTIONS.summary, CV_SECTIONS.researchProfile];

/** Sections whose bullets are achievements, and so must be verb-led. */
const ROLE_SECTIONS: readonly string[] = [CV_SECTIONS.experience, CV_SECTIONS.teaching];

/** Past-tense verbs not ending in -ed, so the opener check does not misfire. */
const IRREGULAR_PAST = new Set([
  'held',
  'led',
  'built',
  'ran',
  'wrote',
  'oversaw',
  'won',
  'set',
  'kept',
  'made',
  'brought',
  'took',
  'met',
  'drew',
  'dealt',
  'sent',
  'began',
  'grew',
  'drove',
  'gave',
  'chose',
  'found',
  'taught',
  'read',
  'laid',
  'cut',
  'sketched',
]);

/** Present-tense openers, allowed only in a role with no end date. */
const PRESENT_ALLOWED = new Set([
  'design',
  'develop',
  'draft',
  'prepare',
  'produce',
  'lead',
  'manage',
  'coordinate',
  'detail',
  'model',
  'render',
  'present',
  'supervise',
  'review',
  'run',
  'handle',
  'teach',
  'assist',
  'survey',
  'document',
  'plan',
  'liaise',
  'oversee',
  'uphold',
  'ensure',
  'collaborate',
  'contribute',
]);

/** A bullet longer than this stops being scannable and starts being skipped. */
const MAX_BULLET_CHARS = 300;

/** Roughly two dense pages. */
const MAX_WORDS = 900;

/** Roughly three: an academic CV lists education, research and conferences in full. */
const MAX_WORDS_ACADEMIC = 1400;

const EN_DASH = '–';
const DATE_RANGE = new RegExp(`^[A-Z][a-z]{2} \\d{4} ${EN_DASH} ([A-Z][a-z]{2} \\d{4}|Present)$`);
const TABLE_ROW = /^\s*\|/;
const TABLE_RULE = /^[\s|:]*-{3,}[\s|:-]*$/;
const RAW_HTML = /<[a-z]+[\s>]/i;

interface Finding {
  readonly file: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
}

function lint(file: string, text: string): Finding[] {
  const found: Finding[] = [];
  const lines = text.split('\n');
  const err = (m: string): void => void found.push({ file, severity: 'error', message: m });
  const warn = (m: string): void => void found.push({ file, severity: 'warning', message: m });

  // Rules are section-scoped: experience bullets must be verb-led achievements, while the
  // bullets under Education, Software or Selected Projects are noun-led and correct as they are.
  let section = '';
  let ongoingRole = false;

  for (const [index, line] of lines.entries()) {
    const lineNo = index + 1;
    if (line.startsWith('## ')) {
      section = line.slice(3).trim();
      continue;
    }

    if (TABLE_ROW.test(line) || TABLE_RULE.test(line.trim())) {
      err(`line ${lineNo}: looks like a table — parsers frequently drop table content`);
    }
    if (RAW_HTML.test(line))
      err(`line ${lineNo}: raw HTML survives into the DOCX and parses unpredictably`);

    if (!ROLE_SECTIONS.includes(section)) continue;

    // Role meta line: "Organisation | Location | Apr 2024 – Jul 2026".
    if (!line.startsWith('- ') && line.includes(' | ')) {
      const period = line.split(' | ').pop()?.trim() ?? '';
      const isRange = DATE_RANGE.test(period);
      const isNote = /^[A-Z]/.test(period) && !/\d{4}/.test(period);
      if (!isRange && !isNote) {
        err(
          `line ${lineNo}: unrecognised date "${period}" — expected "Mon YYYY ${EN_DASH} Mon YYYY"`,
        );
      }
      ongoingRole = isNote || period.endsWith('Present');
      continue;
    }

    if (!line.startsWith('- ')) continue;
    const body = line.slice(2);
    if (body.length > MAX_BULLET_CHARS)
      warn(`line ${lineNo}: bullet is ${body.length} chars (cap ${MAX_BULLET_CHARS})`);
    const opener = (body.split(/[\s,]/)[0] ?? '').toLowerCase();
    const isPast = opener.endsWith('ed') || IRREGULAR_PAST.has(opener);
    const isPresent = PRESENT_ALLOWED.has(opener);
    if (!isPast && !(ongoingRole && isPresent)) {
      err(
        `line ${lineNo}: bullet opens with "${opener}" — use a past-tense verb` +
          (ongoingRole ? ' (or a listed present-tense verb for this ongoing role)' : ''),
      );
    }
  }

  for (const required of REQUIRED_SECTIONS) {
    if (!text.includes(`## ${required}`)) err(`missing required section "${required}"`);
  }
  if (!SUMMARY_SECTIONS.some((s) => text.includes(`## ${s}`))) {
    err(`missing a summary section — one of ${SUMMARY_SECTIONS.map((s) => `"${s}"`).join(', ')}`);
  }
  if (!lines.slice(0, 6).join(' ').includes('@'))
    err('no email address in the opening lines of the body');

  // An academic CV carries education, research, teaching and conferences in full, and panels
  // expect it to run longer than a practice CV; the soft cap follows the document's kind.
  const academic = text.includes(`## ${CV_SECTIONS.researchProfile}`);
  const cap = academic ? MAX_WORDS_ACADEMIC : MAX_WORDS;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words > cap)
    warn(`${words} words — likely over ${academic ? 'three' : 'two'} pages (soft cap ${cap})`);

  return found;
}

function main(): void {
  const files = existsSync(CV_DIR) ? readdirSync(CV_DIR).filter((f) => f.endsWith('.md')) : [];
  if (!files.length) {
    console.error(`No CVs in ${CV_DIR}. Run \`npm run cv:build\` first.`);
    process.exit(1);
  }
  const findings = files.flatMap((f) => lint(f, readFileSync(join(CV_DIR, f), 'utf8')));
  const errors = findings.filter((f) => f.severity === 'error');
  for (const f of findings)
    console.log(`  ${f.severity === 'error' ? 'ERROR  ' : 'warning'} ${f.file}: ${f.message}`);
  console.log(
    `\n${files.length} CV(s) linted — ${errors.length} errors, ${findings.length - errors.length} warnings.\n`,
  );
  if (errors.length) process.exit(1);
}

main();
