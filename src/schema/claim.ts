import { z } from 'zod';

/**
 * Provenance wrapper for facts that appear on the site, the CV or the portfolio PDF.
 *
 * ## Why this exists
 *
 * An architect's portfolio is checked by the people best placed to check it. Practice in a
 * city is a small world: the firm interviewing her may know the firm she worked for, the
 * client, the site and the jury. An invented floor area, an approximated graduation year, a
 * "built" project that was never built, or a role on a firm's project stated larger than it
 * was — none of these is a rounding error. The risk is not malice; it is that a plausible
 * value is *easy to type* and impossible to tell apart later from a real one.
 *
 * Wrapping such fields forces provenance to be stated alongside the value. Fabricating then
 * requires actively writing `state: verified` next to something untrue — commission rather
 * than omission — and every non-verified field is reported on each `check` run and listed in
 * the generated `private/intake.md`, so gaps stay visible instead of ageing into apparent fact.
 *
 * ## The three states
 *
 * | State      | Meaning                                   | Reaches a built artifact?       |
 * |------------|-------------------------------------------|---------------------------------|
 * | `verified` | Confirmed by Amna or Nasik                | Yes                             |
 * | `assumed`  | Our inference, with its basis recorded    | Yes, and only via {@link claim} |
 * | `missing`  | Not known yet                             | No — omitted and reported       |
 *
 * Use {@link claim} for descriptive facts where a recorded inference is acceptable (a city
 * read off a CV, a role read off a job title), and {@link strictClaim} for anything numeric
 * or credential-bearing, which may never be inferred at all.
 */
export const CLAIM_STATES = ['verified', 'assumed', 'missing'] as const;

export type ClaimState = (typeof CLAIM_STATES)[number];

/** A resolved claim as consumed by renderers: the value, or `undefined` when unavailable. */
export interface ResolvedClaim<T> {
  readonly value: T | undefined;
  readonly state: ClaimState;
  readonly basis: string | undefined;
}

/**
 * Build a schema for a claim that tolerates a recorded inference.
 *
 * `assumed` requires a `basis` of real substance — a bare "probably" is rejected, because an
 * unjustified inference is indistinguishable from a guess.
 *
 * @param value - Schema for the underlying value.
 */
export function claim<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion('state', [
    z.object({ state: z.literal('verified'), value, basis: z.string().optional() }),
    z.object({
      state: z.literal('assumed'),
      value,
      basis: z
        .string()
        .min(20, 'An assumed claim must record the reasoning that supports it, in full.'),
    }),
    z.object({ state: z.literal('missing'), basis: z.string().optional() }),
  ]);
}

/**
 * Build a schema for a claim that may **never** be inferred.
 *
 * Omitting the `assumed` branch means a value we have not had confirmed cannot be expressed in
 * the data file at all — the build fails at parse time rather than shipping a plausible-looking
 * invention. This is the rule with no exceptions.
 *
 * Use for: years (graduation, registration, project, award), floor and site areas, budgets,
 * unit counts, competition placings, registration numbers, publication clearance for a firm's
 * project — anything an interviewer could ask Amna to substantiate.
 *
 * @param value - Schema for the underlying value.
 */
export function strictClaim<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion('state', [
    z.object({ state: z.literal('verified'), value, basis: z.string().optional() }),
    z.object({ state: z.literal('missing'), basis: z.string().optional() }),
  ]);
}

/** Shape shared by both builders once parsed, before resolution. */
type ParsedClaim<T> =
  | { state: 'verified'; value: T; basis?: string | undefined }
  | { state: 'assumed'; value: T; basis: string }
  | { state: 'missing'; basis?: string | undefined };

/**
 * Reduce a parsed claim to the value a renderer should use.
 *
 * @returns The value for `verified` and `assumed` claims; `undefined` for `missing`.
 */
export function resolve<T>(parsed: ParsedClaim<T>): ResolvedClaim<T> {
  return parsed.state === 'missing'
    ? { value: undefined, state: 'missing', basis: parsed.basis }
    : { value: parsed.value, state: parsed.state, basis: parsed.basis };
}

/** Narrowing helper: does this claim carry a usable value? */
export function isPresent<T>(
  parsed: ParsedClaim<T>,
): parsed is Exclude<ParsedClaim<T>, { state: 'missing' }> {
  return parsed.state !== 'missing';
}

/**
 * The value of a claim if it has one, else `undefined`.
 *
 * The one-line form every renderer wants. Optional claims (`undefined` in the data) and
 * `missing` claims collapse to the same answer: there is nothing to print.
 */
export function valueOf<T>(parsed: ParsedClaim<T> | undefined): T | undefined {
  return parsed !== undefined && parsed.state !== 'missing' ? parsed.value : undefined;
}

/** True only for a `verified` claim. Used where an inference is not good enough to publish. */
export function isVerified<T>(parsed: ParsedClaim<T> | undefined): boolean {
  return parsed?.state === 'verified';
}
