/**
 * The image modules a build of the layout fixture may reach: only its generated folder.
 *
 * Replaces `image-loaders.ts` when the profile is the fixture (an alias in `astro.config.ts`), so
 * a sample build never carries Amna's images and a real build never carries the fixture's. See
 * `image-loaders.ts` for why the glob decides what is published.
 */
import type { ImageMetadata } from 'astro';

export const LOADERS = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/sample/**/*.{jpg,jpeg,png,webp,avif}',
);
