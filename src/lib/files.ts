/**
 * Names of the downloadable files: the portfolio PDF and the CV documents.
 *
 * Written once, here, because three parties must agree on them — the pages that link to the
 * files, `scripts/make-pdf.ts` and `scripts/make-docx.mjs` that write them, and
 * `scripts/check-dist.ts` that verifies every link resolves. A name typed in two places is a
 * broken download waiting for the first rename.
 */
import type { Profile } from '../schema/profile';

/** `Amna Example` → `Amna-Example`. File names a recruiter's download folder will keep readable. */
export function nameSlug(profile: Profile): string {
  return profile.person.name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * The portfolio PDF's file name. It is served from the site root, `public/<name>`, so its URL
 * is as short as the site's own — the link most often pasted into an application form.
 */
export function portfolioPdfName(profile: Profile): string {
  return `${nameSlug(profile)}-Portfolio.pdf`;
}

/** Site-root-relative path of the portfolio PDF, for `path()`. */
export function portfolioPdfPath(profile: Profile): string {
  return `/${portfolioPdfName(profile)}`;
}

/** Site-root-relative path of a CV document, for `path()`. */
export function cvPath(filename: string, extension: 'pdf' | 'docx'): string {
  return `/cv/${filename}.${extension}`;
}

/**
 * Folder holding a project's web-sized images, relative to the project root, POSIX-style.
 *
 * Real projects live in `src/assets/projects/<id>/`; the layout fixture's in
 * `src/assets/sample/<id>/`, so sample images can never be picked up by a real project that
 * happens to share an id. Lives here, in a module with no side effects, because the image
 * importer must run before `data/profile.yaml` exists — and `profile.ts` locates the profile
 * the moment it is imported. `images.ts` cannot hold it either: it uses `import.meta.glob`,
 * which exists only inside Vite.
 *
 * @param profile - Anything with a `sample` flag: a profile, or `{ sample: false }`.
 */
export function projectImageDir(profile: Pick<Profile, 'sample'>, projectId: string): string {
  return `src/assets/${profile.sample ? 'sample' : 'projects'}/${projectId}`;
}

/** Where the generators write, relative to the project root. */
export interface ArtifactDirs {
  /** Intermediate CV Markdown (never committed). */
  readonly cvMarkdown: string;
  /** CV DOCX and PDF files. */
  readonly cv: string;
  /** The portfolio PDF. */
  readonly portfolio: string;
  /** The LinkedIn pack — paste-ready text that is public on her profile anyway. */
  readonly docs: string;
  /**
   * The intake sheet and the applications pack. Git-ignored: they list what is unconfirmed,
   * where her sources disagree, and what an application still lacks — useful to her, and
   * exactly what should not sit in a public repository a scholarship panel can find.
   */
  readonly private: string;
}

/**
 * Output folders for the generated documents.
 *
 * Real artifacts go to `public/`, where they are committed and served. The layout fixture's go
 * to the git-ignored `build/sample/`: a sample CV in `public/cv/` would be one `git add` away
 * from being published under Amna's name, so the generators are never allowed to put it there.
 */
export function artifactDirs(profile: Profile): ArtifactDirs {
  return profile.sample
    ? {
        cvMarkdown: 'build/sample/cv-md',
        cv: 'build/sample/cv',
        portfolio: 'build/sample',
        docs: 'build/sample/docs',
        private: 'build/sample/private',
      }
    : {
        cvMarkdown: 'build/cv',
        cv: 'public/cv',
        portfolio: 'public',
        docs: 'docs',
        private: 'private',
      };
}
