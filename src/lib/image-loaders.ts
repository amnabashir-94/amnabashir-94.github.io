/**
 * The image modules a build of the real profile may reach: everything under `src/assets/` except
 * the fixture's generated folder.
 *
 * Every file a glob matches becomes part of the build and is copied into `dist/`, whether a page
 * renders it or not — the glob being lazy only defers loading, not emitting. Found 2026-11-01,
 * when a real build contained all 15 fixture images, among them the withheld fixture project's.
 * So a glob must match only what its build may publish. A build of the fixture swaps this module
 * for `image-loaders.sample.ts` (an alias in `astro.config.ts`), and `check-dist` fails on any
 * image in `dist/` that no page uses.
 *
 * Astro-only, like every `import.meta.glob`.
 */
import type { ImageMetadata } from 'astro';

export const LOADERS = import.meta.glob<{ default: ImageMetadata }>([
  '/src/assets/**/*.{jpg,jpeg,png,webp,avif}',
  '!/src/assets/sample/**',
]);
