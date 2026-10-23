/**
 * Generate `private/applications.md` — the pack for filling in job and scholarship applications.
 *
 * Application portals ask the same things in different boxes: degrees with grades and years,
 * current post, a research summary under a word limit, research interests, a motivation
 * statement, conferences, referees. Retyping them per application is how one form ends up
 * saying 2016 where another says 2017. So the answers are generated from the same profile as
 * the site and the CVs, with word counts beside every block that a form might limit.
 *
 * What this deliberately does not do is write her personal statement. It gathers the facts and
 * the story the statement should be built from; the statement itself has to be in her voice,
 * because panels read for exactly that and a ghost-written one undermines everything else.
 *
 * Private (git-ignored): the closing checklist names what an application still lacks.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { absoluteUrl, SITE_URL_IS_PLACEHOLDER } from '../src/config/site';
import { artifactDirs, cvPath, portfolioPdfPath } from '../src/lib/files';
import {
  formatPeriod,
  loadProfile,
  oneLine,
  orderedExperience,
  PROJECT_ROOT,
  publishedProjects,
} from '../src/lib/profile';
import { valueOf } from '../src/schema/claim';

const words = (text: string): number => text.split(/\s+/).filter(Boolean).length;
const counted = (text: string): string => `${text}\n\n_(${words(text)} words)_`;

function main(): void {
  const profile = loadProfile();
  const { person } = profile;
  const dirs = artifactDirs(profile);
  const studies = publishedProjects(profile).filter((p) => p.research);
  const interests = valueOf(profile.research?.interests);
  const site = SITE_URL_IS_PLACEHOLDER ? undefined : absoluteUrl('/');
  const current = orderedExperience(profile).filter((r) => r.end === undefined);
  // Degrees not yet awarded — in progress, or submitted and awaiting defence.
  const unfinished = profile.education.filter((q) => {
    const status = valueOf(q.status);
    return status !== undefined && status !== 'completed';
  });

  const education = profile.education
    .map((q) => {
      const status = valueOf(q.status);
      const started = valueOf(q.started);
      const year = valueOf(q.year);
      const when = year
        ? [started, year].filter(Boolean).join('–')
        : started
          ? `${started}–${status && status !== 'completed' ? 'present' : '(end year to confirm)'}`
          : '';
      const body = q.awardingBody ?? q.institution;
      // As on the CV: no "Lahore, Lahore" when the institution's name carries the city.
      const city = q.location.split(',')[0]?.trim() ?? '';
      const where = city && body.includes(city) ? '' : `, ${q.location}`;
      return [
        `- **${q.degree}** — ${body}${where}`,
        `  - Years: ${when || '(confirm)'}${status && status !== 'completed' ? ` · Status: ${status}` : ''}`,
        valueOf(q.grade) ? `  - Grade: ${valueOf(q.grade)}` : undefined,
        valueOf(q.distinction) ? `  - Distinction: ${valueOf(q.distinction)}` : undefined,
        q.thesis
          ? `  - Thesis: ${q.thesis}${q.supervisor ? ` (supervisor: ${q.supervisor})` : ''}`
          : undefined,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  const roles = orderedExperience(profile)
    .map(
      (r) =>
        `- **${r.title}**, ${r.organisation} — ${formatPeriod(r)}${valueOf(r.location) ? `, ${valueOf(r.location)}` : ''}`,
    )
    .join('\n');

  const researchSummary = profile.research
    ? profile.research.summary.map(oneLine).join('\n\n')
    : '';
  // Shorter versions for tighter boxes: the opening paragraph alone, and the study in one sentence.
  const shortSummary = profile.research?.summary[0] ? oneLine(profile.research.summary[0]) : '';
  const oneSentence = studies[0] ? oneLine(studies[0].summary) : '';

  const studyBlocks = studies
    .map((s) => {
      const r = s.research!;
      return [
        `### ${s.title}`,
        `${r.degree}, ${s.organisation}${r.supervisor ? ` · supervisor: ${r.supervisor}` : ''}`,
        '',
        '**Questions**',
        ...r.questions.map((q, i) => `${i + 1}. ${q}`),
        '',
        '**Methods**',
        ...r.methods.map((m) => `- ${m.label}: ${oneLine(m.text)}`),
        '',
        '**Findings**',
        ...r.findings.map((f) => `- ${f.label}: ${oneLine(f.text)}`),
        '',
        '**Recommendations**',
        ...r.recommendations.map((x) => `- ${x.label}: ${oneLine(x.text)}`),
      ].join('\n');
    })
    .join('\n\n');

  const events = profile.events
    .map(
      (e) =>
        `- ${e.role[0]!.toUpperCase()}${e.role.slice(1)} — ${e.title}, ${e.organiser}${valueOf(e.date) ? `, ${valueOf(e.date)}` : ' (date to confirm)'}`,
    )
    .join('\n');
  const courses = profile.certifications
    .map(
      (c) =>
        `- ${c.title} — ${c.issuer}${c.via ? ` via ${c.via}` : ''}${valueOf(c.status) === 'in progress' ? ' (in progress)' : ''}${valueOf(c.year) ? `, ${valueOf(c.year)}` : ' (year to confirm)'}`,
    )
    .join('\n');

  const academicCv = profile.variants.find((v) => v.kind === 'academic');
  const generalCv = profile.variants.find((v) => v.id === 'general');
  const doc = `# Applications pack — ${person.name}

<!-- Generated by scripts/build-applications.ts from the profile. Do not edit by hand: change
     data/profile.yaml and run \`npm run applications\`. Private: this folder is git-ignored. -->

The answers application forms keep asking for, in one place and in the same words as the CV and
the site. Word counts are given wherever a form might set a limit.

## 1. In one line

${person.headline}, ${person.location.city}. ${oneLine(person.statement)}

## 2. Contact

- Email: ${person.email}
- Portfolio: ${site ?? '(once the site is live)'}
- LinkedIn: ${valueOf(person.links.linkedin) ?? '(to confirm)'}

## 3. Education

${education}

## 4. Current position

${current.map((r) => `- **${r.title}**, ${r.organisation} (since ${formatPeriod(r).split(' – ')[0]})`).join('\n') || '- (none listed)'}

## 5. Employment history (newest first)

${roles}

## 6. Research summary

${researchSummary ? counted(researchSummary) : '_No research section in the profile yet._'}

**Short version** — for a tighter box:

${shortSummary ? counted(shortSummary) : '_—_'}

**One sentence:**

${oneSentence ? counted(oneSentence) : '_—_'}

${interests ? `**Research interests:** ${interests.join('; ')}.` : ''}

${studyBlocks}

## 7. Motivation — raw material for a personal statement

${profile.research?.motivation ? `${oneLine(profile.research.motivation)}` : '_Not recorded._'}

> Write the statement itself in her own voice. Use this as the opening scene, then answer what
> each panel actually asks: why this programme, why now, what she will do with it, and how it
> serves Pakistan when she returns (Chevening, Commonwealth and Fulbright all weigh the last).

## 8. Conferences, workshops and lecture series

${events || '- (none listed)'}

## 9. Courses and certifications

${courses || '- (none listed)'}

## 10. Professional registration

${profile.registrations.map((r) => `- ${r.title}, ${r.body}${valueOf(r.number) ? ` — ${valueOf(r.number)}` : ''}`).join('\n') || '- (none listed)'}

## 11. Documents generated from this profile

- General CV: \`public${cvPath(generalCv?.filename ?? '', 'pdf')}\` (and \`.docx\`)
${academicCv ? `- Academic CV: \`public${cvPath(academicCv.filename, 'pdf')}\` (and \`.docx\`)\n` : ''}- Portfolio PDF: \`public${portfolioPdfPath(profile)}\`

## 12. What applications usually need that is not here yet

- [ ] **Degree status.** ${unfinished.length ? unfinished.map((q) => `${q.degree}: ${valueOf(q.status)}.`).join(' ') + ' Most scholarships for further study require the degree awarded, with the final transcript — check each programme: some accept a letter confirming submission and an expected award date.' : 'Confirm every degree is complete, with transcripts.'}
- [ ] **English-language test** (IELTS / TOEFL / PTE), unless the programme accepts an English-medium
      degree certificate. Not in the profile.
- [ ] **Two or three referees** — typically the thesis supervisor and a senior at her current post.
      Ask them before listing them; nothing about referees is published.
- [ ] **Writing sample** — the final, approved thesis (not a draft), or a paper drawn from it.
- [ ] **Research proposal** — for PhD or research-master's applications; her thesis's own
      "further research" points are a natural start.
- [ ] **Degree certificates and transcripts**, attested where the programme asks (HEC, in Pakistan).
`;

  const outDir = resolve(PROJECT_ROOT, dirs.private);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'applications.md'), doc, 'utf8');
  console.log(`  ${dirs.private}/applications.md written\n`);
}

main();
