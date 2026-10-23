import type { APIRoute } from 'astro';

import { absoluteUrl } from '../config/site';
import {
  formatPeriod,
  loadProfile,
  oneLine,
  orderedExperience,
  publishedProjects,
} from '../lib/profile';
import { portfolioPdfPath } from '../lib/files';
import { valueOf } from '../schema/claim';

/**
 * `llms.txt` — a curated, plain-text map of the site for language models, instead of leaving
 * them to infer one from rendered HTML.
 *
 * Worth doing because the audience includes machines: a recruiter increasingly asks an
 * assistant to summarise a candidate before deciding whether to look further, and a model
 * that has to guess will guess badly — especially about who did what on a team project. So
 * each project states her role, from the same field the pages use.
 */
export const GET: APIRoute = () => {
  const profile = loadProfile();
  const { person } = profile;

  const projects = publishedProjects(profile)
    .map((project) => {
      const facts = [
        project.typology.join(', '),
        valueOf(project.location),
        valueOf(project.period),
      ]
        .filter(Boolean)
        .join(', ');
      const role = valueOf(project.role);
      return `- [${project.title}](${absoluteUrl(`/projects/${project.id}`)}) (${facts}; ${project.organisation}${role ? `; role: ${role}` : ''}): ${oneLine(project.summary)}`;
    })
    .join('\n');

  const roles = orderedExperience(profile)
    .map(
      (role) =>
        `- ${role.title}, ${role.organisation} (${formatPeriod(role)}): ${oneLine(role.summary)}`,
    )
    .join('\n');

  // Research, stated plainly: an assistant asked about her should be able to say what she
  // studied and found, not just that a thesis exists.
  const interests = valueOf(profile.research?.interests);
  const research = publishedProjects(profile)
    .filter((project) => project.research)
    .map((project) => {
      const r = project.research!;
      return [
        `### ${project.title} (${r.degree})`,
        ...r.questions.map((q, i) => `- Question ${i + 1}: ${q}`),
        ...r.findings.map((f) => `- Finding — ${f.label}: ${oneLine(f.text)}`),
      ].join('\n');
    })
    .join('\n\n');
  const researchSection = profile.research
    ? `\n## Research\n${profile.research.summary.map(oneLine).join('\n\n')}\n${interests ? `\nInterests: ${interests.join('; ')}.\n` : ''}\n${research}\n`
    : '';

  const education = profile.education
    .filter((q) => q.level === 'higher')
    .map((q) => {
      const body = q.awardingBody ? `${q.awardingBody} (${q.institution})` : q.institution;
      return `- ${q.degree}, ${body}${valueOf(q.year) ? `, ${valueOf(q.year)}` : ''}${q.thesis ? `. Thesis: ${q.thesis}` : ''}`;
    })
    .join('\n');

  const body = `# ${person.name}

> ${person.headline}, ${person.location.city}, ${person.location.country}. ${oneLine(person.statement)}

${profile.about.map(oneLine).join('\n\n')}

## Projects
${projects}
${researchSection}
## Experience
${roles || '- (none listed)'}

## Education
${education}

## Software
${profile.software.map((g) => `- ${g.label}: ${g.items.join(', ')}`).join('\n')}

## Contact
- Email: ${person.email}
- Location: ${person.location.city}, ${person.location.country}
- Availability: ${oneLine(person.availability)}

## Documents
- [CV, plain text](${absoluteUrl('/cv.txt')})
- [Portfolio PDF](${absoluteUrl(portfolioPdfPath(profile))})
- [About](${absoluteUrl('/about')})${profile.research ? `\n- [Research](${absoluteUrl('/research')})` : ''}
`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
