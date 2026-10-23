import type { APIRoute } from 'astro';

import { loadProfile, variantById } from '../lib/profile';
import { renderCv } from '../lib/cv-markdown';

/**
 * The CV as plain text at a stable URL.
 *
 * The cheapest thing a crawler, scraper or retrieval pipeline can consume: no markup to strip,
 * no PDF to decode. When an assistant is asked "who is Amna and what has she worked on", this
 * is the surface most likely to be read correctly — and it comes from the same renderer as the
 * DOCX, so it cannot drift from what she sends out.
 */
export const GET: APIRoute = () => {
  const profile = loadProfile();
  const text = renderCv(profile, variantById(profile, 'general'))
    .replace(/^#+ /gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^- /gm, '  - ')
    .replace(/\n{3,}/g, '\n\n');

  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
