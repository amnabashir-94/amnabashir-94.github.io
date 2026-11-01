# Amna Bashir — architecture and research portfolio

The source of Amna Bashir's portfolio website, CVs and portfolio PDF — for job and scholarship
applications — all generated from one data file so they always say the same thing.

**Status: 0.3.0.** The site lives at **https://amnabashir-94.github.io/**, published from this
repository by GitHub Pages. Her profile is written from her CV and her M.Arch thesis; the site, a
professional CV, an academic CV and the portfolio PDF all build from it. Project images from practice
are next.

## What this is

One data file describes Amna, her projects and her research, and everything else is generated from it:

```
data/profile.yaml ─┬─→ the site: home, projects, research, about, CV, contact
 + project images  ├─→ the portfolio PDF      landscape A4, featured projects and research
                   ├─→ two CVs (.md)          professional and academic
                   │                          → .docx via pandoc   (for applicant-tracking systems)
                   │                          → .pdf  via Chrome   (for people)
                   ├─→ /cv.txt, /llms.txt     plain-text surfaces for search and assistants
                   └─→ docs/linkedin.md       paste-ready LinkedIn blocks
```

Two working documents are generated too and kept out of the repository: an intake sheet of what is
still unconfirmed, and an applications pack with the answers forms ask for.

## Design decisions worth knowing

**Credit is part of the data.** Every project states Amna's role on it, and shared work credits the
lead architect, firm or team. Practice is a small world: the reader may know the firm. A role stated
larger than it was is the architecture equivalent of a fabricated credential, so `role` is required
and the same words appear on the page, in the PDF, on the CV and on LinkedIn.

**A firm's work is published only with the firm's agreement.** A professional project carries a
`clearance` that must be confirmed before it appears anywhere. Until then it is validated, listed as a
question, and absent from every page — and the build proves it by searching the built site for every
withheld title.

**Facts carry provenance.** Each claim is `verified`, `assumed` (an inference, with its reasoning
recorded) or `missing`. Years, areas, results, registration numbers and clearances use a stricter
wrapper with no `assumed` branch: an unconfirmed one cannot be written down at all, so the build fails
rather than shipping a plausible guess. `npm run check` lists every open item on each run.

**Drawings are never cropped.** Renders and photographs may fill a frame; plans, sections, diagrams and
sheets are always shown whole, on a light mat that stays light in dark mode, because darkening or
cropping a drawing removes what someone was going to read. Every figure links to its full-size image.

**The portfolio PDF is a document, not a printed web page.** Firms ask for one under an upload limit,
so it is printed from its own route — cover, contents, a title block and brief per project, then the
drawings — with JPEG renditions sized to keep it small. `npm run pdf` reports its size.

**Research is set out as research.** A scholarship panel reads a thesis for its questions, methods,
evidence and findings, so a research project carries those as structure — shown on its page, on a
Research page, on a sheet of the portfolio PDF and in `llms.txt`. Sample sizes are strict claims: they
are the first number a reviewer checks.

**Two CVs from the same facts.** The professional CV leads with experience, the way a practice reads;
the academic CV leads with education and grades, then research, teaching, conferences and courses, the
order a scholarship panel scores in. One model decides the sections of both, so the Word file, the PDF
and the page cannot disagree.

**Generated, not maintained.** The CVs' Word files are built by pandoc with table parsing switched off
and checked by a lint for the structures that break applicant-tracking systems. The PDFs are printed
from real HTML, so they carry real text — her previous CV was an image with no text in it at all,
which an applicant-tracking system reads as blank. Nothing is edited by hand.

## Commands

| Command                                     | Does                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`                               | Local dev server                                                           |
| `npm run dev:sample`                        | Dev server on the fictional fixture, for layout work                       |
| `npm run check`                             | Validate profile, images and version; report open items; typecheck         |
| `npm run images -- "<folder>" <project-id>` | Web-sized copies of originals, plus the YAML to paste                      |
| `npm run cv`                                | Build the CV variants → lint → DOCX                                        |
| `npm run build`                             | Build the site to `dist/`, then check the built pages                      |
| `npm run pdf`                               | Print the CV and portfolio PDFs from the built site (needs Chrome or Edge) |
| `npm run verify`                            | Check, CVs, LinkedIn pack, working documents, build                        |
| `npm run shots -- <url> <dir>`              | Phone and desktop screenshots, light and dark                              |

## Updating the content

Edit `data/profile.yaml`; add images with `npm run images`; run `npm run verify`, then `npm run pdf`,
then `npm run build`. Read the PDFs before committing them — they are what a practice receives.
`data/sample/profile.yaml` is a complete worked example of every field.

## Stack

Astro 7 (static output) · TypeScript · Zod · sharp · pandoc · headless Chrome. No web fonts, no
client-side JavaScript, no analytics.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages
(Pages source: GitHub Actions). The build's own checks gate the deploy. Moving to another address is a
two-line change to `SITE_URL` and `BASE_PATH` in `src/config/site.ts`; nothing else hard-codes either.
