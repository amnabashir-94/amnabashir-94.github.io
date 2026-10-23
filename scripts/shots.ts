/**
 * Screenshots of the served site, at true phone and desktop widths, in light and dark.
 *
 * Why this exists: "look at the actual artifact" is how this repo verifies a visual change, and
 * the obvious tool gets it wrong. Headless Chrome's `--window-size=390,…` silently renders at a
 * minimum of ~504 px and crops the result to 390, so a "phone" screenshot shows clipped text no
 * phone would ever see — a verifier artefact that reads exactly like a layout bug. This drives
 * Chrome over the DevTools protocol with real device-metrics emulation instead, and reports any
 * horizontal overflow, which is the commonest phone-layout defect.
 *
 * Usage: serve the site (`npm run preview`, or `npm run dev`), then
 *   npm run shots -- [baseUrl] [outDir]
 * Writes `<outDir>/<page>-<device>-<scheme>-NN.png`. A development tool, not part of the build.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { BASE_PATH } from '../src/config/site';
import { loadProfile, publishedProjects } from '../src/lib/profile';

const BASE = process.argv[2] ?? `http://localhost:4321${BASE_PATH}`;
const OUT = process.argv[3] ?? join(process.cwd(), 'shots');
const PORT = 9333;

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

/** Every page type once: the first published project stands for all project pages. */
function pages(): ReadonlyArray<{ name: string; path: string }> {
  const profile = loadProfile();
  const first = publishedProjects(profile)[0];
  return [
    { name: 'home', path: '/' },
    { name: 'projects', path: '/projects/' },
    ...(first ? [{ name: 'project', path: `/projects/${first.id}/` }] : []),
    ...(profile.research ? [{ name: 'research', path: '/research/' }] : []),
    { name: 'about', path: '/about/' },
    { name: 'cv', path: '/cv/' },
    { name: 'contact', path: '/contact/' },
  ];
}

const DEVICES = [
  { name: 'phone', width: 390, height: 844, scale: 2, mobile: true },
  { name: 'desktop', width: 1440, height: 900, scale: 1, mobile: false },
] as const;

const SCHEMES = ['light', 'dark'] as const;

/** Minimal DevTools-protocol client over Node's built-in WebSocket. */
class Cdp {
  private nextId = 1;
  private readonly pending = new Map<number, (result: unknown) => void>();

  private constructor(private readonly ws: WebSocket) {
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data)) as {
        id?: number;
        result?: unknown;
        error?: { message: string };
      };
      if (msg.id === undefined) return;
      const resolve = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error !== undefined) throw new Error(msg.error.message);
      resolve?.(msg.result);
    });
  }

  static async connect(url: string): Promise<Cdp> {
    const ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve());
      ws.addEventListener('error', () => reject(new Error(`cannot connect to ${url}`)));
    });
    return new Cdp(ws);
  }

  send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise<T>((resolve) => this.pending.set(id, (r) => resolve(r as T)));
  }

  close(): void {
    this.ws.close();
  }
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const chrome = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (chrome === undefined)
    throw new Error('No Chrome or Edge found; add its path to CHROME_CANDIDATES.');
  mkdirSync(OUT, { recursive: true });

  const proc = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(OUT, '.chrome-profile')}`,
    'about:blank',
  ]);

  try {
    let target: { webSocketDebuggerUrl: string } | undefined;
    for (let i = 0; i < 40 && target === undefined; i++) {
      await sleep(250);
      try {
        const list = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as Array<{
          type: string;
          webSocketDebuggerUrl: string;
        }>;
        target = list.find((t) => t.type === 'page');
      } catch {
        // Chrome not listening yet.
      }
    }
    if (target === undefined) throw new Error('Chrome did not expose a page target.');

    const cdp = await Cdp.connect(target.webSocketDebuggerUrl);
    await cdp.send('Page.enable');

    for (const device of DEVICES) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: device.width,
        height: device.height,
        deviceScaleFactor: device.scale,
        mobile: device.mobile,
      });
      for (const scheme of SCHEMES) {
        await cdp.send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-color-scheme', value: scheme }],
        });
        for (const page of pages()) {
          await cdp.send('Page.navigate', { url: `${BASE}${page.path}` });
          await sleep(1200);
          // Lazy images below the fold only load when scrolled to; scroll through once first.
          await cdp.send('Runtime.evaluate', {
            expression:
              'new Promise(r => { let y = 0; const t = setInterval(() => { window.scrollTo(0, y += 800); if (y > document.body.scrollHeight) { clearInterval(t); window.scrollTo(0, 0); r(0); } }, 60); })',
            awaitPromise: true,
          });
          await sleep(500);
          const { result } = await cdp.send<{ result: { value: number } }>('Runtime.evaluate', {
            expression: 'document.documentElement.scrollWidth - window.innerWidth',
            returnByValue: true,
          });
          const { result: height } = await cdp.send<{ result: { value: number } }>(
            'Runtime.evaluate',
            {
              expression: 'document.documentElement.scrollHeight',
              returnByValue: true,
            },
          );
          // Slices of about one and a quarter screens: a whole page in one image is too tall to
          // read once scaled down, and a slice is roughly what a reader sees before scrolling.
          const slice = Math.round(device.height * 1.25);
          const count = Math.ceil(height.value / slice);
          for (let i = 0; i < count; i++) {
            const y = i * slice;
            const shot = await cdp.send<{ data: string }>('Page.captureScreenshot', {
              format: 'png',
              captureBeyondViewport: true,
              clip: {
                x: 0,
                y,
                width: device.width,
                height: Math.min(slice, height.value - y),
                scale: 1,
              },
            });
            const file = join(
              OUT,
              `${page.name}-${device.name}-${scheme}-${String(i + 1).padStart(2, '0')}.png`,
            );
            writeFileSync(file, Buffer.from(shot.data, 'base64'));
          }
          const overflow = result.value > 0 ? `  !! horizontal overflow ${result.value}px` : '';
          console.log(
            `${page.name}-${device.name}-${scheme}: ${height.value}px tall, ${count} slices${overflow}`,
          );
        }
      }
    }
    cdp.close();
  } finally {
    proc.kill();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
