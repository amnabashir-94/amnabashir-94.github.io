/**
 * Deployment-shape constants.
 *
 * Everything that changes when this site moves between a GitHub Pages sub-path, a user site
 * and a custom domain lives here and nowhere else. Nothing in `src/` may hard-code the origin
 * or the base path — always go through {@link path} or {@link absoluteUrl}, so a move stays a
 * two-line edit in this file rather than a hunt through templates. `scripts/check-dist.ts`
 * enforces it on the built pages: an internal link that ignores the base path fails the build.
 */

/**
 * Origin the site is served from. No trailing slash.
 *
 * Decided 2026-10-23: a `<username>.github.io` user-site repository, so this becomes
 * `https://<username>.github.io`. Until Amna's username is confirmed it is the reserved `.invalid`
 * placeholder — deliberately unresolvable rather than a guess, so a wrong origin can never be
 * published into canonical URLs, the sitemap or the JSON-LD. `check-dist` refuses it in CI, which
 * is the deploy path, while local builds still run.
 */
export const SITE_URL = 'https://github-username.invalid';

/**
 * Sub-path the site is served under, with a leading and no trailing slash.
 *
 * `''`: a user-site repository serves from the domain root — the shortest link to paste into an
 * application, and the only setup in which `robots.txt` is read at all. A project repository
 * would set this to `/<repo-name>`.
 */
export const BASE_PATH = '';

/** True while {@link SITE_URL} is still the placeholder. Read by the deploy-path gate. */
export const SITE_URL_IS_PLACEHOLDER = SITE_URL.endsWith('.invalid');

/**
 * Resolve a site-root-relative path to a href usable in markup.
 *
 * @param to - Path relative to the site root, e.g. `/projects` or `/cv/Amna-CV.pdf`.
 * @returns The path prefixed with {@link BASE_PATH}, e.g. `/portfolio/projects`.
 */
export function path(to: string): string {
  const normalized = to.startsWith('/') ? to : `/${to}`;
  return normalized === '/' ? `${BASE_PATH}/` : `${BASE_PATH}${normalized}`;
}

/**
 * Resolve a site-root-relative path to a fully-qualified URL.
 *
 * Required for canonical links, Open Graph tags, JSON-LD and sitemaps — relative paths are not
 * valid in any of those, and crawlers silently mis-resolve them.
 *
 * @param to - Path relative to the site root, e.g. `/cv.txt`.
 * @returns Absolute URL, e.g. `https://<username>.github.io/portfolio/cv.txt`.
 */
export function absoluteUrl(to: string): string {
  return `${SITE_URL}${path(to)}`;
}
