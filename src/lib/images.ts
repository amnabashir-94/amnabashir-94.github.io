/**
 * Resolve the image files named in the profile to Astro image metadata.
 *
 * The profile names images by file name; Astro's image pipeline needs an imported module.
 * `import.meta.glob` bridges the two without an import per image, and because it is lazy, only
 * the images a page actually renders are processed and emitted — an unpublished project's
 * images never reach `dist/`.
 *
 * Astro-only: `import.meta.glob` exists inside Vite and nowhere else. Node scripts that need to
 * know where images live use `projectImageDir()` from `files.ts` instead.
 */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

import { absoluteUrl, BASE_PATH, SITE_URL } from '../config/site';
import { projectImageDir } from './files';
import type { Profile, Project, ProjectImage } from '../schema/profile';
import { UNCROPPABLE_KINDS } from '../schema/profile';

const LOADERS = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/**/*.{jpg,jpeg,png,webp,avif}',
);

/** Portrait file names, in preference order. Dropping one into `src/assets/` is all it takes. */
const PORTRAIT_CANDIDATES = ['portrait.jpg', 'portrait.jpeg', 'portrait.png', 'portrait.webp'];

/**
 * Load one project image.
 *
 * Throws rather than skipping a missing file: `check-profile` already fails on one, so reaching
 * here without the file means the two disagree, and a page silently missing its plan is worse
 * than a failed build.
 */
export async function loadImage(
  profile: Profile,
  project: Project,
  file: string,
): Promise<ImageMetadata> {
  const key = `/${projectImageDir(profile, project.id)}/${file}`;
  const loader = LOADERS[key];
  if (!loader) throw new Error(`Image not found: ${key} (named by project "${project.id}").`);
  return (await loader()).default;
}

/**
 * Responsive widths for an image: the candidates it is large enough for, plus its own width.
 *
 * Filtering candidates by the original's width alone drops every size above it — a 954 px
 * figure got only a 640 px rendition and was stretched to fill a 1,190 px column, visibly soft.
 * Adding the native width means the browser can always fetch the sharpest version there is.
 */
export function widthsFor(meta: ImageMetadata, candidates: readonly number[]): number[] {
  const fit = candidates.filter((w) => w < meta.width);
  return [...fit, meta.width];
}

/** A project image with its metadata loaded, ready to render. */
export interface LoadedImage extends ProjectImage {
  readonly meta: ImageMetadata;
  /** Shown whole on a light mat, never cropped: drawings, diagrams, sheets. */
  readonly uncroppable: boolean;
}

/** Load every image of a project, in authored order. */
export async function loadProjectImages(
  profile: Profile,
  project: Project,
): Promise<LoadedImage[]> {
  return Promise.all(
    project.images.map(async (image) => ({
      ...image,
      meta: await loadImage(profile, project, image.file),
      uncroppable: UNCROPPABLE_KINDS.has(image.kind),
    })),
  );
}

/** The cover image of a project, loaded. */
export async function loadCover(profile: Profile, project: Project): Promise<LoadedImage> {
  const image = project.images.find((candidate) => candidate.file === project.cover);
  if (!image) throw new Error(`Project "${project.id}" has no image named by its cover.`);
  return {
    ...image,
    meta: await loadImage(profile, project, image.file),
    uncroppable: UNCROPPABLE_KINDS.has(image.kind),
  };
}

/**
 * Amna's portrait, if one has been added to `src/assets/`. The fixture never has one, so the
 * sample preview cannot put a stranger's face next to her name.
 */
export async function loadPortrait(profile: Profile): Promise<ImageMetadata | undefined> {
  if (profile.sample) return undefined;
  for (const name of PORTRAIT_CANDIDATES) {
    const loader = LOADERS[`/src/assets/${name}`];
    if (loader) return (await loader()).default;
  }
  return undefined;
}

/**
 * A fully-qualified URL for a social card or JSON-LD image: a 1200 px JPEG of the given image.
 *
 * Link previews are how a forwarded portfolio is first seen, and they want an absolute URL to a
 * moderately sized, universally supported format. `getImage` returns a path that already
 * carries the base path, so only the origin is added here.
 */
export async function socialImageUrl(meta: ImageMetadata): Promise<string> {
  const image = await getImage({ src: meta, width: Math.min(1200, meta.width), format: 'jpg' });
  return image.src.startsWith(BASE_PATH) ? `${SITE_URL}${image.src}` : absoluteUrl(image.src);
}

/**
 * URL of the largest rendition of an image, for the "open full size" link under a drawing.
 *
 * Plans and sections carry detail no responsive size will show on a phone; a link to the full
 * image, opened by the browser's own viewer, gives zoom without any client JavaScript.
 */
export async function fullSizeSrc(image: LoadedImage): Promise<string> {
  const format = image.meta.format === 'png' ? 'png' : 'jpg';
  const full = await getImage({ src: image.meta, width: Math.min(2400, image.meta.width), format });
  return full.src;
}
