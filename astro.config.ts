import { fileURLToPath } from 'node:url';

import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import { BASE_PATH, SITE_URL } from './src/config/site';
import { loadProfile } from './src/lib/profile';

/**
 * A build may reach only the images its profile can publish, because every image the build can
 * reach is copied into `dist/` (see `src/lib/image-loaders.ts`). Keyed on the profile's own
 * `sample` flag, the same one `projectImageDir()` uses, so the glob and the folder rule agree.
 */
const imageLoaderAlias = loadProfile().sample
  ? [
      {
        find: /^\.\/image-loaders$/,
        replacement: fileURLToPath(new URL('./src/lib/image-loaders.sample.ts', import.meta.url)),
      },
    ]
  : [];

/**
 * Static-only build targeting GitHub Pages.
 *
 * `site` and `base` are read from `src/config/site.ts` rather than written here, so the origin
 * and sub-path have exactly one definition shared with the code that builds canonical URLs,
 * JSON-LD and the CV's portfolio link.
 */
export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  output: 'static',
  // Pages serves `/foo/index.html` for `/foo`, so directory format avoids redirect hops.
  build: { format: 'directory' },
  trailingSlash: 'ignore',
  // Print routes exist only as the source of the PDFs. They carry noindex; keeping them out of
  // the sitemap avoids advertising a duplicate of every CV and the whole portfolio.
  integrations: [sitemap({ filter: (page) => !page.includes('/print/') })],
  vite: { resolve: { alias: imageLoaderAlias } },
});
