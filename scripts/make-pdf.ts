/**
 * Print the CV variants and the portfolio to PDF from the built site, with headless Chrome.
 *
 * Printing from real HTML matters. A PDF exported by a design tool is often a flattened image,
 * which is the commonest reason a CV "vanishes" into an applicant-tracking system — there is no
 * text to extract. Rendering the actual page produces a text-based PDF that stays identical to
 * the site because it *is* the site.
 *
 * Prints from the dedicated `/print/` routes, which carry no site chrome. Reports the portfolio's
 * size against the limit firms commonly set for uploads and email attachments, because a
 * portfolio that bounces is a portfolio nobody saw.
 *
 * Needs a built site (`npm run build`). Chrome is used directly rather than through Playwright,
 * so there is no browser download and no extra dependency: this runs locally, before a human
 * reads the output, and the files are committed. CI never needs it.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { BASE_PATH } from '../src/config/site';
import { loadProfile, PROJECT_ROOT } from '../src/lib/profile';
import { artifactDirs, portfolioPdfName } from '../src/lib/files';

const PORT = 4331;

/** The upload or attachment limit most often quoted by practices. Above it, warn. */
const PORTFOLIO_LIMIT_MB = 10;

/** Chrome, then Edge — both Chromium, both support --print-to-pdf. */
const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env['LOCALAPPDATA'] ?? ''}/Google/Chrome/Application/chrome.exe`,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function findBrowser(): string {
  const found = BROWSERS.find((candidate) => existsSync(candidate));
  if (!found) throw new Error(`No Chromium browser found. Looked in: ${BROWSERS.join(' | ')}`);
  return found;
}

/** Poll until the preview server answers, rather than sleeping a hopeful fixed interval. */
async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Preview server did not start within ${timeoutMs}ms at ${url}`);
}

function print(browser: string, url: string, out: string): void {
  execFileSync(
    browser,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--no-pdf-header-footer',
      // Images on the portfolio sheets must finish decoding before the page is printed.
      '--virtual-time-budget=15000',
      `--print-to-pdf=${out}`,
      url,
    ],
    { stdio: 'ignore' },
  );
}

const megabytes = (file: string): number => statSync(file).size / 1024 / 1024;

async function main(): Promise<void> {
  if (!existsSync(resolve(PROJECT_ROOT, 'dist/index.html'))) {
    console.error('No built site in dist/. Run `npm run build` (or `npm run build:sample`) first.');
    process.exit(1);
  }
  const profile = loadProfile();
  const dirs = artifactDirs(profile);
  const cvDir = resolve(PROJECT_ROOT, dirs.cv);
  const portfolioDir = resolve(PROJECT_ROOT, dirs.portfolio);
  mkdirSync(cvDir, { recursive: true });
  mkdirSync(portfolioDir, { recursive: true });
  const browser = findBrowser();

  // Astro's own entry point with this Node binary: Node 24 refuses to spawn a .cmd shim without
  // a shell, and a shell reintroduces argument-escaping problems. `--ignore-lock` because Astro
  // 7.4+ allows one preview server per project and refuses to start a second — so without it,
  // this step fails whenever someone is already previewing the site. This server is private to
  // the run, on its own port, and killed at the end.
  const server = spawn(
    process.execPath,
    [
      resolve(PROJECT_ROOT, 'node_modules/astro/bin/astro.mjs'),
      'preview',
      '--port',
      String(PORT),
      '--ignore-lock',
    ],
    { cwd: PROJECT_ROOT, stdio: 'ignore' },
  );

  const origin = `http://localhost:${PORT}${BASE_PATH}`;
  try {
    await waitForServer(`${origin}/`);

    for (const variant of profile.variants) {
      const out = join(cvDir, `${variant.filename}.pdf`);
      print(browser, `${origin}/print/cv/${variant.id}/`, out);
      console.log(`  ${dirs.cv}/${variant.filename}.pdf  (${megabytes(out).toFixed(2)} MB)`);
    }

    const portfolio = join(portfolioDir, portfolioPdfName(profile));
    print(browser, `${origin}/print/portfolio/`, portfolio);
    const size = megabytes(portfolio);
    console.log(`  ${dirs.portfolio}/${portfolioPdfName(profile)}  (${size.toFixed(2)} MB)`);
    if (size > PORTFOLIO_LIMIT_MB) {
      console.warn(
        `\n  !! The portfolio is over ${PORTFOLIO_LIMIT_MB} MB — many practices' upload forms and mail ` +
          'servers reject that. Feature fewer projects, or lower MAX_IMAGES_PER_PROJECT in ' +
          'src/pages/print/portfolio.astro.',
      );
    }
    console.log(`\nPDFs written. Read them before committing — they are what a firm receives.\n`);
  } finally {
    server.kill();
  }
}

await main();
