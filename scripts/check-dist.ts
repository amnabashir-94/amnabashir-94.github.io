/**
 * Consumer-side gate: checks the BUILT site in `dist/`.
 *
 * A green build says files were produced, not that a reader gets a correct page. So every promise
 * the site makes is checked on the HTML a reader actually receives. Runs as the last step of
 * `npm run build`, which is what the deploy workflow runs — a page that breaks a rule is never
 * published.
 *
 * Failures (exit 1):
 *
 *  1. **No sample content.** The fixture's banner must not appear, unless `ALLOW_SAMPLE` says a
 *     sample build was asked for. This is what makes the fixture impossible to deploy as Amna's.
 *  2. **Withheld projects stay withheld.** The title of every project `isPublishable()` rejects —
 *     drafts, and professional work without verified clearance — must appear on no page. The
 *     rule lives in one function; this checks nothing went around it.
 *  3. **Structure.** Per page: one `h1`, a `<title>`, a language; outside `/print/`, a meta
 *     description and a canonical URL. Every `<img>` has non-empty alt text.
 *  4. **Links.** Every internal `href` and `src` resolves to a file in `dist/` — which also proves
 *     nothing ignored the base path.
 *
 * Deploy-readiness, a failure in CI and a warning locally, so local previews keep working:
 *
 *  5. `SITE_URL` is not the `.invalid` placeholder.
 *  6. The downloadable PDFs and DOCX files exist (they are built locally and committed).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { BASE_PATH, SITE_URL_IS_PLACEHOLDER } from '../src/config/site';
import { isPublishable, loadProfile } from '../src/lib/profile';

const DIST = join(process.cwd(), 'dist');
const IN_CI = process.env['CI'] === 'true' || process.env['GITHUB_ACTIONS'] === 'true';
const ALLOW_SAMPLE = process.env['ALLOW_SAMPLE'] === '1';

/** Downloads are built locally and committed; their absence is only fatal on the deploy path. */
const DOWNLOAD = /\.(pdf|docx)$/i;

interface Finding {
  readonly page: string;
  readonly message: string;
  readonly fatal: boolean;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Decode the handful of entities Astro emits, so a title like "Rock &amp; Roll" still matches. */
function decode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/** Map an internal URL to the file `dist/` must contain for it to resolve. */
function targetFor(url: string): string | undefined {
  const clean = url.split('#')[0]!.split('?')[0]!;
  if (!clean.startsWith('/')) return undefined; // external, mailto:, tel:, relative fragment
  if (BASE_PATH && clean !== BASE_PATH && !clean.startsWith(`${BASE_PATH}/`)) return 'OUTSIDE_BASE';
  const local = decodeURIComponent(clean.slice(BASE_PATH.length)) || '/';
  return local.endsWith('/')
    ? `${local}index.html`
    : /\.[a-z0-9]+$/i.test(local)
      ? local
      : `${local}/index.html`;
}

function checkPage(file: string, html: string, withheld: string[], out: Finding[]): void {
  const page = `/${relative(DIST, file).split(sep).join('/')}`;
  const isPrint = page.startsWith('/print/');
  const add = (message: string, fatal = true): void => void out.push({ page, message, fatal });

  if (!ALLOW_SAMPLE && html.includes('data-sample-banner')) {
    add('sample-fixture banner present — this build came from data/sample, not the real profile');
  }

  const text = decode(html);
  for (const title of withheld) {
    if (text.includes(title)) add(`withheld project "${title}" appears on this page`);
  }

  const h1s = html.match(/<h1[\s>]/g)?.length ?? 0;
  if (h1s !== 1) add(`${h1s} <h1> elements (expected exactly one)`);
  if (!/<title>[^<]+<\/title>/.test(html)) add('no <title>');
  if (!/<html[^>]*\slang="[a-z-]+"/.test(html)) add('no language on <html>');
  if (!isPrint) {
    if (!/<meta name="description" content="[^"]{30,}"/.test(html))
      add('no meta description of substance');
    if (!/<link rel="canonical" href="https?:\/\//.test(html)) add('no absolute canonical URL');
  }

  for (const img of html.match(/<img\b[^>]*>/g) ?? []) {
    if (!/\salt="[^"]+"/.test(img)) add(`<img> without alt text: ${img.slice(0, 90)}…`);
  }

  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const url = match[1]!;
    const target = targetFor(url);
    if (target === undefined) continue;
    if (target === 'OUTSIDE_BASE') {
      add(`link ignores the base path "${BASE_PATH}": ${url}`);
      continue;
    }
    if (!existsSync(join(DIST, target))) {
      const isDownload = DOWNLOAD.test(target);
      add(
        isDownload
          ? `download not built yet: ${url} — run \`npm run cv\` and \`npm run pdf\`, then rebuild`
          : `broken internal link: ${url}`,
        !isDownload || IN_CI,
      );
    }
  }
}

function main(): void {
  if (!existsSync(DIST)) {
    console.error('check-dist: dist/ does not exist — run `astro build` first.');
    process.exit(1);
  }
  const profile = loadProfile();
  const withheld = profile.projects
    .filter((project) => !isPublishable(project))
    .map((p) => p.title);

  const findings: Finding[] = [];
  if (SITE_URL_IS_PLACEHOLDER) {
    findings.push({
      page: 'src/config/site.ts',
      message: 'SITE_URL is still the .invalid placeholder — set it to her GitHub Pages origin',
      fatal: IN_CI,
    });
  }

  const pages = walk(DIST).filter((file) => file.endsWith('.html'));
  for (const file of pages) checkPage(file, readFileSync(file, 'utf8'), withheld, findings);

  // De-duplicate: a missing download is linked from several pages; say so once per page set.
  const seen = new Set<string>();
  const unique = findings.filter((f) => {
    const key = f.fatal ? `${f.page}|${f.message}` : f.message;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (const f of unique) console.log(`  ${f.fatal ? 'FAIL' : 'warn'}  ${f.page}: ${f.message}`);
  const fatal = unique.filter((f) => f.fatal).length;
  const leaked = unique.some((f) => f.message.startsWith('withheld project'));
  const withheldNote = withheld.length
    ? `; ${withheld.length} withheld project(s) ${leaked ? 'LEAKED' : 'confirmed absent'}`
    : '';
  console.log(
    `\ncheck-dist: ${pages.length} pages — ${fatal} failure(s), ${unique.length - fatal} warning(s)${withheldNote}.\n`,
  );
  if (fatal) process.exit(1);
}

main();
