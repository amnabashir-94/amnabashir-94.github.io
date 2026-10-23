/**
 * Render a CV variant as ATS-shaped Markdown.
 *
 * Draws the model from `cv-model.ts` and nothing else, so the sections, their order and their
 * content are exactly those of the on-page CV and the PDF. Two consumers: the pandoc pipeline
 * that produces the DOCX, and the site's `/cv.txt`.
 */
import { buildCv, type CvLine } from './cv-model';
import type { Profile, Variant } from '../schema/profile';

export { CV_SECTIONS } from './cv-model';

function line(l: CvLine): string {
  const head = l.lead ? `**${l.lead}** ${l.text}` : l.text;
  return l.detail ? `- ${head}\n  ${l.detail}` : `- ${head}`;
}

/** Assemble one variant into ATS-shaped Markdown. */
export function renderCv(profile: Profile, variant: Variant): string {
  const cv = buildCv(profile, variant);
  const parts: string[] = [`# ${cv.name}`, cv.headline, cv.contact.join(' | ')];

  for (const section of cv.sections) {
    let body = '';
    if (section.type === 'paragraph') body = section.text;
    if (section.type === 'list') body = section.lines.map(line).join('\n');
    if (section.type === 'roles') {
      body = section.roles
        .map((r) => `### ${r.title}\n\n${r.meta}\n\n${r.bullets.map((b) => `- ${b}`).join('\n')}`)
        .join('\n\n');
    }
    parts.push(`## ${section.title}\n\n${body}`);
  }
  return `${parts.join('\n\n')}\n`;
}
