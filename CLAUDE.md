# CLAUDE.md — amna-portfolio

> **Two layers.** _How we work_ (communication, cadence, diagnosis discipline, versioning, deploy and
> git principles) lives in the operator's global `~/.claude/CLAUDE.md`. **This file holds only what is
> specific to this repository.** Method there; facts here. Where they overlap, the global file wins on
> method and this one wins on facts.

## What this project is

- **`amna-portfolio`** = the architecture portfolio, research portfolio, CV system and portfolio PDF
  for **Amna Bashir**, an architect in Lahore — for **job applications and scholarship applications**.
  Astro 7 static, TypeScript strict, Zod, sharp (via Astro), pandoc, headless Chrome. No client
  JavaScript, no web fonts, no analytics.
- **Flow:** `data/profile.yaml` + `src/assets/projects/<id>/*` → Zod schema (`src/schema/`) → pages
  (`src/pages/`) → static `dist/` → GitHub Pages under **Amna's own GitHub account**. Also generated
  from the same source: a professional and an academic CV (`.md` → `.docx` via pandoc, `.pdf` via
  Chrome), the landscape portfolio PDF, `/cv.txt`, `/llms.txt`, `docs/linkedin.md`, and — privately —
  `private/intake.md` and `private/applications.md`.
- **One source, many surfaces.** A candidate whose site, CV, portfolio PDF and LinkedIn disagree looks
  careless; for an architect, disagreement about _who did what on a project_ looks worse. Generating
  them all from one file makes disagreement impossible rather than unlikely.
- **Sources (2026-10-23):** her CV (an image-only Photoshop PDF — no text layer, which is why a
  generated CV matters) and her M.Arch thesis, Draft II (313 pp.). Both in `source-material/`. Facts
  stated in either are `verified`; inferences are `assumed`; the rest `missing`. Where the thesis
  disagrees with itself (sample sizes, degree name, chart units), the detail is in the private
  `private/thesis-review.md` and the public data stays neutral.
- **Built ahead of its content.** The system was first built against the fictional fixture
  `data/sample/profile.yaml`, which stays as the worked example and test bed (`npm run dev:sample`).
- **Not yet published.** No remote, no push. `SITE_URL` is the `.invalid` placeholder until her GitHub
  username is known; CI refuses to deploy it.

## Decisions on record (2026-10-23, Nasik)

- **Hosting:** a `<username>.github.io` user-site repository, served from the root — `BASE_PATH = ''`.
- **Contact:** **email only.** Her phone number is not put in `data/profile.yaml`, so it appears on no
  page, CV or PDF. The schema keeps `phone` optional so the decision can be reversed in one line.
- **No photo** on the public site. `src/assets/portrait.*` stays absent; the site is built to work
  without one.
- **M.Arch:** Master of Architecture (not M.Phil, despite the thesis title page); thesis submitted,
  awaiting defence. Award year and CGPA to add once awarded.
- **Commit identity:** Amna's name and email, taken from her CV and confirmed with Nasik before the
  first commit. Nothing is committed under anyone else's identity.
- **Private outputs (git-ignored `private/`):** the intake sheet, the applications pack and the thesis
  review list what is unconfirmed and where her sources disagree. In a public repository a scholarship
  panel can find, that would work against her — so unlike the lawyer's portfolio this repo is modelled
  on, the intake is not in `docs/`. Bases written into `data/profile.yaml` (public) stay neutral.
- **Academic CV:** a second variant (`kind: academic`) for scholarships — education with grades and
  school certificates first, then research, teaching, conferences and courses. No "references on
  request" line; named referees go in only once they have agreed.

## Documentation map

| Doc                        | Read it for                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `README.md`                | Overview, commands, design decisions (public-facing)                |
| `private/intake.md`        | Generated, private: what is unverified or unknown, as questions     |
| `private/applications.md`  | Generated, private: answers for job and scholarship forms           |
| `private/thesis-review.md` | Hand-written, private: where the thesis draft disagrees with itself |
| `docs/linkedin.md`         | Generated: paste-ready LinkedIn blocks                              |
| `docs/working-history.md`  | Dated log of what changed and _why_                                 |
| `CHANGELOG.md`             | Version history                                                     |
| `src/schema/claim.ts`      | The honesty guardrail — read before touching any fact               |
| `src/schema/profile.ts`    | Every field, with the reason it exists                              |
| `data/sample/profile.yaml` | A complete worked example of the format, every claim state shown    |

## Where each kind of thing lives

- `data/profile.yaml` — the source of truth. Facts live here and nowhere else.
- `data/sample/profile.yaml` — the layout fixture. Fictional; `sample: true`.
- `src/assets/projects/<project-id>/` — **web-sized** project images (≤ 2400 px, ≤ 1.5 MB), written by
  `npm run images`. Never originals. `src/assets/portrait.jpg` — optional portrait.
- `src/assets/sample/` — the fixture's generated images. Git-ignored; regenerated on demand.
- `source-material/` — Amna's raw files (CVs, portfolio PDFs, originals, certificates). Local only,
  excluded via `.git/info/exclude`, never tracked. Its `README.txt` says what goes where.
- `src/schema/` — Zod schemas and claim primitives. Validation lives here, nowhere else.
- `src/lib/` — loading, formatting and selection shared by pages and scripts:
  `profile.ts` (load, order, **`isPublishable()`**, `roleMeta()`), `images.ts` (Astro-only image
  loading, `widthsFor()`), **`cv-model.ts` (which sections each CV variant has, in what order — the
  only place that decides)**, `cv-markdown.ts` (draws that model as Markdown), `files.ts` (download
  names, output folders, `projectImageDir()` — no side effects, so scripts can use it before a
  profile exists), `gaps.ts`.
- `private/` — git-ignored generated working documents (intake, applications pack) and the
  hand-written thesis review.
- `src/config/site.ts` — the **only** place `SITE_URL` and `BASE_PATH` are written.
- `src/components/`, `src/layouts/`, `src/pages/` — presentation only. No business rules.
- `src/pages/print/` — chrome-free sources for the PDFs. Noindexed, out of the sitemap.
- `scripts/` — gates and generators. A check that matters goes here and into `check` or `build`.
- `public/cv/`, `public/<Name>-Portfolio.pdf` — committed build artifacts, read before committing.
- **Put a thing where its kind lives.** A publication rule belongs in `src/lib/profile.ts`, shared by
  every renderer; a validation rule in `src/schema/`; never a fact in markup.

## The rules with no exceptions

1. **No year, area, budget, count, result, registration number or publication clearance is ever
   inferred.** `strictClaim()` has no `assumed` branch, so such a value cannot be written into the
   profile unconfirmed — the build fails at parse time. Do not add one; do not widen the wrapper. A
   figure that would help goes into `private/intake.md` as a question. Grades, degree start years,
   event dates and research sample sizes are strict too. Numbers in prose (`about`, `summary`) must
   come straight from a source — the thesis's chart values do not, because their units are unstated.
2. **Her role on every project is stated, and others are credited.** `role` is required on every
   project; `credits` names the lead architect, firm or team for shared work. A firm's project
   presented as her own is the architecture equivalent of a fabricated credential.
3. **Professional work publishes only with the firm's verified clearance.** `isPublishable()` is the
   single rule; every surface goes through it, and `check-dist` proves no withheld title appears on any
   built page.
4. **Drawings are never cropped.** `drawing`, `diagram` and `sheet` images render whole on a light mat,
   in both colour schemes, on the site and in the PDF.
5. **Sample content can never ship.** `sample: true` puts a banner on every page; `check-dist` fails a
   build containing it unless `ALLOW_SAMPLE=1` (set only by `scripts/sample.mjs`). Sample artifacts go to
   the git-ignored `build/sample/`, never `public/`.

## Conventions

- **Annotate to the bar, and it is a high one.** Every exported symbol and every script gets a
  docstring saying _why_ it exists. This project is mostly judgement encoded as code; a reader who
  cannot see the reasoning will undo it.
- **Naming:** `camelCase` in TS, `kebab-case` for files, project ids and image file names, British
  spelling in prose (`organisation`, `colour`) to match the CV's register.
- **Stable identifiers:** project `id` and variant `id` appear in URLs (`/projects/<id>`, `/cv/<id>`) and
  image folders. Never rename one in place once published — add and redirect.
- **Fail loud on missing essentials:** the schema throws rather than producing a partial page or CV.
- **Keep docs current with the change**, in the same commit series; the _why_ goes in
  `docs/working-history.md`.

## Verify / build commands

```bash
npm ci                 # install (npm 11 skips esbuild's postinstall; harmless, tsx still runs)
npm run check          # profile + images + gap report, version agreement, then astro check
npm run dev            # dev server on the real profile
npm run dev:sample     # dev server on the fixture (generates its images first)
npm run build          # astro build, then check-dist over the built pages
npm run build:sample   # the same against the fixture, sample banner allowed
npm run images -- "<originals folder>" <project-id>   # web copies + a YAML stub to paste
npm run cv             # CV markdown → lint → DOCX
npm run pdf            # CV and portfolio PDFs from the built site (needs a build; Chrome or Edge)
npm run intake         # regenerate private/intake.md (git-ignored)
npm run applications   # regenerate private/applications.md (git-ignored)
npm run linkedin       # regenerate docs/linkedin.md
npm run verify         # check + cv + linkedin + intake + applications + build
npm run shots -- <baseUrl> <outDir>   # phone/desktop, light/dark screenshots of a served site
```

**Order after a profile change:** `npm run verify`, then `npm run pdf`, then `npm run build` again so
the dist link check sees the fresh PDFs. Partial regeneration is how artifacts drift apart. **Look at
the result**: `npm run shots` for pages, open the PDFs — a green build only says files were produced.

To run any script against the fixture, set `PROFILE_FILE=data/sample/profile.yaml` (PowerShell:
`$env:PROFILE_FILE = '…'`).

## Git & commits

- **Branch:** `main`; branch only for something substantial and independently revertible.
- **Commits:** imperative, conventional prefix, the _why_ in the body, one focused commit per change.
- **Attribution: anonymous** — no `Co-Authored-By`, no tool trailers. The repository publishes under
  Amna's name; authorship lives in git metadata. `.claude/settings.json` blanks Claude Code's own
  attribution. Repo-local `user.name` / `user.email` are set to Amna's once confirmed; do not override.
- **Commit and push only when asked.** Never force-push or rewrite history without asking.

## Versioning

SemVer in `package.json`, mirrored by `package-lock.json` and the top entry of `CHANGELOG.md`; bump
_with_ the change, using `npm version <x.y.z> --no-git-tag-version` so the lock follows.
`scripts/check-version.ts` (in `npm run check`) fails if the three disagree.
MAJOR = a change to published URLs or the profile schema's shape; MINOR = a new surface, generator or
project; PATCH = fixes and content edits.

## Deploy (not yet set up)

Push to `main` → `.github/workflows/deploy.yml` → Pages (source: GitHub Actions). The deploy runs
`npm run build`, so `check-dist` gates it; **in CI** it also refuses the placeholder origin and missing
PDFs/DOCX. Gated: confirm before the first push; verify the live URL after each deploy — fetch the
served page, not just the workflow status. A red post-deploy check means stop.

**Before the first push:** set `SITE_URL` to `https://<username>.github.io` (`BASE_PATH` is already
`''`); create the repository named exactly `<username>.github.io`; set Pages source to GitHub Actions.

## Footguns

- **Astro 7.4+ allows one `astro preview` per project** (a lock file) and refuses a second. `make-pdf`
  therefore passes `--ignore-lock` to its private server; `npx astro preview stop` ends a stray one.
- **Node 24 will not spawn a `.cmd` shim without a shell.** Scripts spawn
  `node_modules/astro/bin/astro.mjs` with `process.execPath` directly.
- **`<Picture>` wraps `<img>`**: a sized box must size the `<picture>` too, or `height: 100%` on the
  image resolves to nothing (found as grey bands under every card).
- **`images.ts` uses `import.meta.glob`**, which exists only inside Vite. Node scripts must not import
  it; the folder rule they need is `projectImageDir()` in `profile.ts`.
- **Chrome embeds JPEG in a PDF as-is and re-encodes everything else losslessly**, so the portfolio
  route requests JPEG renditions; switching to PNG or WebP there multiplies the PDF size.
- **`robots.txt` is inert on a project sub-path** — crawlers read it only at a domain root.
- **`.gitattributes` forces LF.** Do not relax it; Git Bash cannot run a script whose shebang ends in CR.
- **Personal working area:** excluded locally via `.git/info/exclude`; never list it in `.gitignore`
  or any tracked file.
