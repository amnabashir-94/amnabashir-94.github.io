import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';

import { isVerified, valueOf } from '../schema/claim';
import {
  ProfileSchema,
  type Profile,
  type Project,
  type Role,
  type Variant,
} from '../schema/profile';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The data file to load, relative to the project root.
 *
 * `data/profile.yaml` always, except when `PROFILE_FILE` points elsewhere — which only
 * `scripts/sample.mjs` does, to preview the layout from the fixture in `data/sample/`. An
 * environment variable rather than a flag because the same loader runs inside the Astro build
 * and inside plain Node scripts, and the environment is the one channel both inherit.
 */
const PROFILE_FILE = process.env['PROFILE_FILE'] ?? 'data/profile.yaml';

/**
 * Locate the profile.
 *
 * Two very different callers need this: the Node scripts, where this module sits in `src/lib`,
 * and the Astro build, where it has been bundled into `dist/.prerender/chunks` and a path
 * relative to the module no longer points anywhere real. So walk up from both the module and
 * the working directory and take the first hit — then fail with the list of places searched,
 * so a miss is diagnosable rather than an opaque ENOENT from inside a bundler chunk.
 */
function locateProfile(): { root: string; file: string } {
  if (isAbsolute(PROFILE_FILE)) return { root: process.cwd(), file: PROFILE_FILE };
  const roots = [
    process.cwd(),
    resolve(HERE, '../..'),
    resolve(HERE, '../../..'),
    resolve(HERE, '../../../..'),
  ];
  const root = roots.find((candidate) => existsSync(resolve(candidate, PROFILE_FILE)));
  if (!root) {
    throw new Error(
      `Could not locate ${PROFILE_FILE}. Looked under: ${roots.join(' | ')}.\n` +
        'Until the real profile exists, preview the layout with `npm run dev:sample`.',
    );
  }
  return { root, file: resolve(root, PROFILE_FILE) };
}

const located = locateProfile();

/** Absolute path to the source-of-truth data file in use. */
export const PROFILE_PATH = located.file;

/** Absolute path to the project root: the directory the profile path was resolved against. */
export const PROJECT_ROOT = located.root;

let cached: Profile | undefined;

/**
 * Load and validate the profile.
 *
 * Throws on any schema violation rather than returning a partial profile: a CV or portfolio
 * built from half-valid data is worse than none, because the damage is invisible.
 *
 * @returns The parsed, validated profile. Cached after the first call.
 */
export function loadProfile(): Profile {
  if (cached) return cached;
  const raw = parse(readFileSync(PROFILE_PATH, 'utf8')) as unknown;
  cached = ProfileSchema.parse(raw);
  return cached;
}

/** Collapse a wrapped YAML block scalar back into single-line prose. */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Month names used in every rendered date, so the site, CV and PDF never diverge. */
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Render a `YYYY-MM` string as `Mon YYYY`.
 *
 * ATS parsers key off a consistent date format; mixing styles within one document is a common
 * cause of a role being dropped from an extracted work history.
 */
export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const index = Number(month) - 1;
  return `${MONTHS[index] ?? '???'} ${year}`;
}

/** Render a role's date range, e.g. `Apr 2024 – Jul 2026`, `Apr 2023 – Present`. */
export function formatPeriod(role: Role): string {
  if (!role.start) return role.periodNote ?? '';
  return `${formatMonth(role.start)} – ${role.end ? formatMonth(role.end) : 'Present'}`;
}

/**
 * A role's meta line — organisation, location (when known), period — joined by `separator`.
 * One function, so the site, the CV and the LinkedIn pack cannot format a role differently.
 */
export function roleMeta(role: Role, separator = ' · '): string {
  return [role.organisation, valueOf(role.location), formatPeriod(role)]
    .filter((part): part is string => Boolean(part))
    .join(separator);
}

/** Experience ordered newest first, with any undated (ongoing) engagement leading. */
export function orderedExperience(profile: Profile): Role[] {
  return [...profile.experience].sort((a, b) => {
    if (!a.start) return -1;
    if (!b.start) return 1;
    return b.start.localeCompare(a.start);
  });
}

/**
 * Order a role's highlights for a variant: bullets carrying the variant's lead tags first, in
 * the order those tags are listed; everything else after, in authored order.
 */
export function orderHighlights(role: Role, variant: Variant): Role['highlights'] {
  const rank = (h: Role['highlights'][number]): number => {
    const positions = variant.leadTags
      .map((tag, i) => (h.tags.includes(tag) ? i : -1))
      .filter((i) => i >= 0);
    return positions.length ? Math.min(...positions) : variant.leadTags.length;
  };
  return [...role.highlights]
    .map((h, i) => ({ h, i, r: rank(h) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map(({ h }) => h);
}

/**
 * Order a role's highlights for a variant and keep only the strongest few.
 *
 * The single entry point used by every CV artifact. Sharing it is what guarantees the Word file
 * a recruiter's system parses and the PDF a person reads contain exactly the same claims.
 */
export function selectHighlights(role: Role, variant: Variant): Role['highlights'] {
  return orderHighlights(role, variant).slice(0, variant.maxHighlightsPerRole);
}

/** Competency groups ordered by relevance to the variant, trimmed to its limit. */
export function selectCompetencies(profile: Profile, variant: Variant): Profile['competencies'] {
  const rank = (tags: readonly string[]): number => {
    const hits = variant.leadTags
      .map((tag, i) => (tags.includes(tag) ? i : -1))
      .filter((i) => i >= 0);
    return hits.length ? Math.min(...hits) : variant.leadTags.length;
  };
  return [...profile.competencies]
    .map((group, i) => ({ group, i, r: rank(group.tags) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, variant.maxCompetencyGroups)
    .map(({ group }) => group);
}

/** Look up a variant by id, failing loudly rather than silently falling back. */
export function variantById(profile: Profile, id: string): Variant {
  const found = profile.variants.find((v) => v.id === id);
  if (!found) throw new Error(`No CV variant with id "${id}" in the profile.`);
  return found;
}

/**
 * Whether a project may appear on any published surface.
 *
 * The one place the rule is written, and every renderer — site, PDF, CV, llms.txt, sitemap —
 * goes through it. A draft never publishes. A professional project publishes only once the
 * firm's clearance is *verified*: an inference that the firm would not mind is exactly the
 * kind of assumption that costs a reference.
 */
export function isPublishable(project: Project): boolean {
  if (project.draft) return false;
  return project.context !== 'professional' || isVerified(project.clearance);
}

/** First year of a project's period, for ordering. Unknown periods sort last. */
function startYear(project: Project): number {
  return project.period.state === 'verified' ? Number(project.period.value.slice(0, 4)) : 0;
}

/**
 * Every publishable project: featured ones first in their curated order, then the rest newest
 * first. Curated order leads because for an architect sequence is an editorial decision —
 * the strongest project goes first — not something a date should decide.
 */
export function publishedProjects(profile: Profile): Project[] {
  const publishable = profile.projects.filter(isPublishable);
  const featured = featuredProjects(profile);
  const rest = publishable
    .filter((project) => !featured.includes(project))
    .sort((a, b) => startYear(b) - startYear(a));
  return [...featured, ...rest];
}

/** The featured, publishable projects, in the order `featured` lists them. */
export function featuredProjects(profile: Profile): Project[] {
  return profile.featured
    .map((id) => profile.projects.find((project) => project.id === id))
    .filter((project): project is Project => project !== undefined && isPublishable(project));
}

/** Look up a project by id, failing loudly. */
export function projectById(profile: Profile, id: string): Project {
  const found = profile.projects.find((project) => project.id === id);
  if (!found) throw new Error(`No project with id "${id}" in the profile.`);
  return found;
}

/**
 * A project's one-line meta: typology, period, location — whatever of them is known.
 * Missing claims drop out rather than rendering as a gap.
 */
export function projectMeta(project: Project): string {
  const parts = [project.typology.join(', ')];
  if (project.period.state === 'verified') parts.push(project.period.value);
  if (project.location.state !== 'missing') parts.push(project.location.value);
  return parts.join(' · ');
}

/** Capitalise the first letter of a status for display: "under construction" → "Under construction". */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `tel:` href for a display phone number. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
