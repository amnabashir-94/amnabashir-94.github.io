# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versioning follows
[SemVer](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-10-23

Amna's real profile, written from her CV and her M.Arch thesis, and the system extended for
scholarship applications as well as jobs. Not yet published.

### Added

- **Her profile** (`data/profile.yaml`): five roles, four qualifications with grades, two
  registrations, five courses, six conferences and workshops, a gold medal, and her M.Arch thesis as
  the first project. Every fact carries its source; 9 inferences and 17 unknowns are listed as
  questions.
- **Research as structure.** A project can carry research questions, methods, sample sizes (strict),
  fieldwork sites, findings and recommendations — rendered on the project page, on a sheet of the
  portfolio PDF, in `llms.txt`, and as `Thesis` JSON-LD.
- **Research page** (`/research/`): research profile, how the question arose, interests, each thesis,
  earlier research, conferences and continuing study. Exists only when the profile has research.
- **Academic CV** — a second variant ordered for scholarship panels: education with grades and school
  certificates, research, interests, teaching, practice, awards, conferences, courses.
- **Applications pack** (`private/applications.md`): the answers application forms ask for, with word
  counts, and a checklist of what applications still need.
- Schema: grades, degree start years and status, supervisors, school certificates, courses with their
  platform and status, conferences with her role, research interests and motivation.

### Changed

- **Breaking (schema):** a role's `location` is now a claim, so an unstated city is recorded as an
  inference rather than written as fact. Acceptable at 0.x with nothing published.
- **CV sections are decided in one place** (`src/lib/cv-model.ts`) and drawn by both the Markdown/DOCX
  renderer and the page/PDF, so the two cannot drift.
- **The intake sheet moved to the git-ignored `private/`**: it records where sources disagree, which
  should not sit in a public repository.
- Figures are never shown wider than their native size, and always get their native-width rendition —
  a 954 px map had been stretched from a 640 px copy.
- The portfolio PDF skips a contents page for a single project, and an approach sheet with no image
  for a research project; the closing sheet now lays out in two columns.

### Fixed

- "Lahore, Lahore" when an institution's name already contains the city.
- The masthead's missing space before the headline.

## [0.1.0] — 2026-10-23

The system, built and verified against a fictional fixture before Amna's content arrived. Not yet
published.

### Added

- **Single source of truth.** `data/profile.yaml` describes Amna and her projects once; the site, the
  portfolio PDF, the CV variants, the plain-text surfaces, the LinkedIn pack and the intake sheet are
  all generated from it.
- **Projects as first-class entries**, each with her role, credits for others, period, status,
  location, typology, area, brief, approach, outcome, software and images.
- **Claim gate.** Facts carry `verified` / `assumed` / `missing` provenance; years, areas, results,
  registration numbers and publication clearance use a stricter wrapper with no `assumed` branch.
- **Publication rule.** Professional work appears only once the firm's clearance is verified; drafts
  never appear. One function decides, and the build checks no withheld title reaches any page.
- **Site** — home, projects index, a page per project (title block, numbered figures, full-size links),
  about, CV and contact. Drawings shown whole on a light mat; light and dark schemes; no client script.
- **Portfolio PDF** — landscape A4 from a dedicated print route: cover, contents with page numbers, a
  title block and brief per project, approach beside the first drawing, then the drawings.
- **CV** — on the page, as DOCX via pandoc (table parsing disabled) and as a text-based PDF; an ATS lint
  for structure, dates, verb-led bullets and required sections, including Software.
- **Image import** — `npm run images` writes web-sized copies of originals, strips metadata (including
  GPS) and prints the profile entries to paste, with alt text left empty so it must be written.
- **Gates** — `check-profile` (schema, images, gap report) and `check-dist` (built pages: sample banner,
  withheld projects, structure, alt text, internal links and base path; in CI also the placeholder
  origin and missing downloads).
- **Layout fixture** — `data/sample/profile.yaml`, a fictional architect covering every field and claim
  state, with generated placeholder images stamped "SAMPLE". Can never be deployed.
- **Machine-readable surface** — JSON-LD `Person` and per-project `CreativeWork`, `/cv.txt`, `/llms.txt`,
  sitemap, and a `robots.txt` that welcomes assistant crawlers (and disallows everything for a sample).
- **Review tool** — `npm run shots`: true phone and desktop screenshots in both colour schemes.
