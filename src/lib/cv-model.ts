/**
 * The CV as data: which sections a variant has, in what order, holding what.
 *
 * Two renderers draw a CV — `cv-markdown.ts` (the DOCX and `/cv.txt`) and `CvDocument.astro`
 * (the page and the PDF). If each chose its own sections, the Word file a practice's system
 * parses and the PDF a scholarship panel reads would drift apart with the first edit. So every
 * decision lives here, once, and both renderers only draw what this returns.
 *
 * Two shapes. A **professional** CV leads with experience, the way a practice reads. An
 * **academic** CV leads with education and grades, then research, teaching, conferences and
 * courses — the order scholarship and admissions panels score in — and includes school
 * certificates, which Pakistani scholarship forms ask for and a practice does not.
 */
import { absoluteUrl, SITE_URL_IS_PLACEHOLDER } from '../config/site';
import {
  featuredProjects,
  oneLine,
  orderedExperience,
  publishedProjects,
  roleMeta,
  selectCompetencies,
  selectHighlights,
} from './profile';
import { valueOf } from '../schema/claim';
import type { Profile, Role, Variant } from '../schema/profile';

/** Section headings. Exported so the CV lint checks the very strings the renderers write. */
export const CV_SECTIONS = {
  summary: 'Professional Summary',
  researchProfile: 'Research Profile',
  experience: 'Professional Experience',
  teaching: 'Teaching Experience',
  projects: 'Selected Projects',
  research: 'Research',
  interests: 'Research Interests',
  education: 'Education',
  registration: 'Professional Registration and Memberships',
  software: 'Software',
  competencies: 'Core Competencies',
  recognition: 'Awards and Honours',
  events: 'Conferences, Workshops and Lecture Series',
  certifications: 'Courses and Certifications',
  languages: 'Languages',
} as const;

/** One line of a list section: an optional bold lead, the text, an optional second line. */
export interface CvLine {
  readonly lead?: string | undefined;
  readonly text: string;
  readonly detail?: string | undefined;
}

export interface CvRole {
  readonly title: string;
  readonly meta: string;
  readonly bullets: readonly string[];
}

export type CvSection =
  | { readonly title: string; readonly type: 'paragraph'; readonly text: string }
  | { readonly title: string; readonly type: 'roles'; readonly roles: readonly CvRole[] }
  | { readonly title: string; readonly type: 'list'; readonly lines: readonly CvLine[] };

export interface CvModel {
  readonly name: string;
  readonly headline: string;
  readonly contact: readonly string[];
  readonly sections: readonly CvSection[];
}

/**
 * Contact details, in the body — many parsers ignore headers. The portfolio URL appears only
 * once it is real: a placeholder origin on a CV is worse than none.
 */
function contactParts(profile: Profile): string[] {
  const { person } = profile;
  const parts = [`${person.location.city}, ${person.location.country}`, person.email];
  if (person.phone) parts.push(person.phone);
  if (!SITE_URL_IS_PLACEHOLDER) parts.push(absoluteUrl('/'));
  const linkedin = valueOf(person.links.linkedin);
  if (linkedin) parts.push(linkedin);
  return parts;
}

function toCvRole(role: Role, variant: Variant): CvRole {
  return {
    title: role.title,
    meta: roleMeta(role, ' | '),
    bullets: selectHighlights(role, variant).map((h) => {
      const metric = h.metric?.state === 'verified' ? ` (${h.metric.value})` : '';
      return `${oneLine(h.text)}${metric}`;
    }),
  };
}

const isTeaching = (role: Role): boolean =>
  role.highlights.some((h) => h.tags.includes('teaching'));

/** Education lines. Academic CVs include school certificates; professional ones do not. */
function educationLines(profile: Profile, academic: boolean): CvLine[] {
  return profile.education
    .filter((q) => academic || q.level === 'higher')
    .map((q) => {
      // Lead with the awarding university: the name a parser and an overseas reader recognise.
      const body = q.awardingBody ? `${q.awardingBody} (${q.institution})` : q.institution;
      const started = valueOf(q.started);
      const year = valueOf(q.year);
      const status = valueOf(q.status);
      // A completion year is shown only when verified; without one, an in-progress degree
      // reads "2019–present" and any other reads "from 2019" rather than an open dash.
      let when = '';
      if (year) when = started ? `${started}–${year}` : String(year);
      else if (started) when = status && status !== 'completed' ? `${started}–present` : `from ${started}`;
      const extras = [valueOf(q.distinction), valueOf(q.grade)].filter(Boolean).join(', ');
      const detail = [
        q.thesis ? `Thesis: ${q.thesis}` : undefined,
        academic && q.supervisor ? `Supervisor: ${q.supervisor}` : undefined,
        status && status !== 'completed' ? `Status: ${status}` : undefined,
      ]
        .filter(Boolean)
        .join('. ');
      // "University of Engineering and Technology, Lahore, Lahore, Pakistan" reads as a typo:
      // when the institution's name already carries the city, the location is left off.
      const city = q.location.split(',')[0]?.trim() ?? '';
      const where = city && body.includes(city) ? '' : `, ${q.location}`;
      return {
        lead: q.degree,
        text: `— ${body}${where}${when ? ` | ${when}` : ''}${extras ? ` | ${extras}` : ''}`,
        detail: detail || undefined,
      };
    });
}

function projectLines(profile: Profile): CvLine[] {
  return featuredProjects(profile).map((project) => {
    const facts = [project.typology.join(', '), valueOf(project.location), valueOf(project.period)]
      .filter(Boolean)
      .join(', ');
    const role = valueOf(project.role);
    return { lead: project.title, text: `— ${facts}.${role ? ` Role: ${role}.` : ''}` };
  });
}

/** Research projects for the academic CV: title, degree, one-line summary, the methods named. */
function researchLines(profile: Profile): CvLine[] {
  return publishedProjects(profile)
    .filter((project) => project.research)
    .map((project) => ({
      lead: project.title,
      text: `— ${project.research!.degree}${valueOf(project.period) ? `, ${valueOf(project.period)}` : ''}. ${oneLine(project.summary)}`,
      detail: `Methods: ${project.research!.methods.map((m) => m.label).join(', ')}.`,
    }));
}

function registrationLines(profile: Profile): CvLine[] {
  return profile.registrations.map((r) => ({
    text: `${r.title}, ${r.body}${valueOf(r.number) ? ` (${valueOf(r.number)})` : ''}${valueOf(r.year) ? `, ${valueOf(r.year)}` : ''}`,
  }));
}

function recognitionLines(profile: Profile): CvLine[] {
  return profile.recognition.map((item) => {
    const result = valueOf(item.result);
    const year = valueOf(item.year);
    return {
      text: `${result ? `${result}, ` : ''}${item.title} — ${item.issuer}${year ? `, ${year}` : ''}`,
    };
  });
}

/** Events. A professional CV keeps only those where she did more than attend. */
function eventLines(profile: Profile, academic: boolean): CvLine[] {
  return profile.events
    .filter((e) => academic || e.role !== 'attendee')
    .map((e) => {
      const role = e.role.charAt(0).toUpperCase() + e.role.slice(1);
      const date = valueOf(e.date);
      return {
        text: `${role}: ${e.title} — ${e.organiser}${e.venue ? `, at ${e.venue}` : ''}${date ? `, ${date}` : ''}`,
        detail: e.sessions.length ? `Sessions: ${e.sessions.join('; ')}` : undefined,
      };
    });
}

function certificationLines(profile: Profile): CvLine[] {
  return profile.certifications.map((c) => {
    const status = valueOf(c.status);
    const year = valueOf(c.year);
    return {
      text: `${c.title} — ${c.issuer}${c.via ? `, via ${c.via}` : ''}${year ? `, ${year}` : ''}${status === 'in progress' ? ' (in progress)' : ''}`,
    };
  });
}

const groupLines = (groups: ReadonlyArray<{ label: string; items: readonly string[] }>): CvLine[] =>
  groups.map((g) => ({ lead: `${g.label}:`, text: g.items.join(', ') }));

/** Push a list section only when it has lines: an empty heading reads as a gap. */
function list(sections: CvSection[], title: string, lines: CvLine[]): void {
  if (lines.length) sections.push({ title, type: 'list', lines });
}

/** Assemble the CV for one variant. */
export function buildCv(profile: Profile, variant: Variant): CvModel {
  const academic = variant.kind === 'academic';
  const roles = orderedExperience(profile);
  const sections: CvSection[] = [];
  const languages = profile.languages.map((l) => `${l.name} (${l.proficiency})`).join(', ');

  if (academic) {
    sections.push({
      title: CV_SECTIONS.researchProfile,
      type: 'paragraph',
      text: oneLine(variant.summary),
    });
    list(sections, CV_SECTIONS.education, educationLines(profile, true));
    list(sections, CV_SECTIONS.research, researchLines(profile));
    const interests = valueOf(profile.research?.interests);
    if (interests)
      sections.push({
        title: CV_SECTIONS.interests,
        type: 'paragraph',
        text: interests.join('; '),
      });
    const teaching = roles.filter(isTeaching);
    if (teaching.length) {
      sections.push({
        title: CV_SECTIONS.teaching,
        type: 'roles',
        roles: teaching.map((r) => toCvRole(r, variant)),
      });
    }
    const practice = roles.filter((r) => !isTeaching(r));
    if (practice.length) {
      sections.push({
        title: CV_SECTIONS.experience,
        type: 'roles',
        roles: practice.map((r) => toCvRole(r, variant)),
      });
    }
    list(sections, CV_SECTIONS.recognition, recognitionLines(profile));
    list(sections, CV_SECTIONS.events, eventLines(profile, true));
    list(sections, CV_SECTIONS.certifications, certificationLines(profile));
    list(sections, CV_SECTIONS.registration, registrationLines(profile));
    list(sections, CV_SECTIONS.software, groupLines(profile.software));
    list(sections, CV_SECTIONS.competencies, groupLines(selectCompetencies(profile, variant)));
    sections.push({ title: CV_SECTIONS.languages, type: 'paragraph', text: languages });
    // No "References: available on request" — panels assume it, and the line costs a page.
    // Named referees belong here once they have agreed to be named; until then, nothing.
  } else {
    sections.push({
      title: CV_SECTIONS.summary,
      type: 'paragraph',
      text: oneLine(variant.summary),
    });
    if (roles.length) {
      sections.push({
        title: CV_SECTIONS.experience,
        type: 'roles',
        roles: roles.map((r) => toCvRole(r, variant)),
      });
    }
    list(sections, CV_SECTIONS.projects, projectLines(profile));
    list(sections, CV_SECTIONS.education, educationLines(profile, false));
    list(sections, CV_SECTIONS.registration, registrationLines(profile));
    list(sections, CV_SECTIONS.software, groupLines(profile.software));
    list(sections, CV_SECTIONS.competencies, groupLines(selectCompetencies(profile, variant)));
    list(sections, CV_SECTIONS.recognition, recognitionLines(profile));
    list(sections, CV_SECTIONS.certifications, certificationLines(profile));
    list(sections, CV_SECTIONS.events, eventLines(profile, false));
    sections.push({ title: CV_SECTIONS.languages, type: 'paragraph', text: languages });
  }

  return {
    name: profile.person.name,
    headline: variant.headline,
    contact: contactParts(profile),
    sections,
  };
}
