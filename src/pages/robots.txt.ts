import type { APIRoute } from 'astro';

import { absoluteUrl, BASE_PATH } from '../config/site';
import { loadProfile } from '../lib/profile';

/**
 * Explicitly welcome the assistant crawlers as well as the search ones.
 *
 * The goal is the opposite of the usual one: this site *wants* to be ingested, because being
 * retrievable when someone asks an assistant about Amna is worth as much as ranking in a search.
 *
 * Caveat worth knowing: on a GitHub Pages project sub-path this file lands at
 * `/portfolio/robots.txt`, and crawlers only read `/robots.txt` at a domain root. It is inert
 * there and starts working unchanged on a `<username>.github.io` repository or a custom domain.
 * A sample build disallows everything, so a preview can never be indexed as her site.
 */
const CRAWLERS = ['GPTBot', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'CCBot'];

export const GET: APIRoute = () => {
  const lines = loadProfile().sample
    ? ['User-agent: *', 'Disallow: /', '']
    : [
        'User-agent: *',
        'Allow: /',
        '',
        ...CRAWLERS.flatMap((agent) => [`User-agent: ${agent}`, 'Allow: /', '']),
        `Sitemap: ${absoluteUrl('/sitemap-index.xml')}`,
        `# Plain-text CV: ${absoluteUrl('/cv.txt')}`,
        `# Site summary for language models: ${absoluteUrl('/llms.txt')}`,
        `# Served from base path: ${BASE_PATH || '/'}`,
        '',
      ];
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
