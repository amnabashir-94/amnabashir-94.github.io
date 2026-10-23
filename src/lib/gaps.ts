/**
 * Find every claim in the profile that is not `verified`.
 *
 * Shared by `scripts/check-profile.ts`, which prints the list on every run, and
 * `scripts/build-intake.ts`, which turns it into the confirm-or-correct sheet. One walker for
 * both means the sheet can never disagree with what the check reports.
 */
import type { ClaimState } from '../schema/claim';

export interface Gap {
  /** Schema path, e.g. `projects[2].period`. */
  readonly path: string;
  readonly state: Exclude<ClaimState, 'verified'>;
  /** The recorded reasoning (assumed) or note (missing). */
  readonly basis: string | undefined;
  /** The inferred value, for an assumed claim; shown so it can be confirmed or corrected. */
  readonly value: unknown;
}

/**
 * Walk a parsed profile collecting every `assumed` or `missing` claim.
 *
 * Recognises a claim structurally — an object with a `state` of `assumed` or `missing` — so a
 * new claim field is picked up the moment it is added to the schema, with no list to update.
 */
export function collectGaps(node: unknown, path = '', out: Gap[] = []): Gap[] {
  if (node === null || typeof node !== 'object') return out;

  if (Array.isArray(node)) {
    node.forEach((item, i) => collectGaps(item, `${path}[${i}]`, out));
    return out;
  }

  const record = node as Record<string, unknown>;
  const state = record['state'];
  if (state === 'assumed' || state === 'missing') {
    out.push({ path, state, basis: record['basis'] as string | undefined, value: record['value'] });
    return out;
  }

  for (const [key, value] of Object.entries(record)) {
    collectGaps(value, path ? `${path}.${key}` : key, out);
  }
  return out;
}
