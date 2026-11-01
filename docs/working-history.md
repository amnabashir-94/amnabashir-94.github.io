# Working history

A dated log of what changed and why. The changelog says what shipped; this says why it was built
that way, for whoever picks it up next.

## 2026-10-23 — the system, built ahead of its content

**Starting point.** A portfolio for Amna, an architect, modelled on two existing personal-site
systems built the same way (one for a lawyer, one for an engineer): one data file, a provenance gate
on facts, generated CVs. Her CV and files had not arrived, so the system was built and verified
against a fictional fixture first, and her content lands into a structure that already works.

**What changed for an architect, and why.**

- **Projects became the unit.** A lawyer is judged on roles; an architect on projects. Projects got
  their own schema, pages, title block and a place on the CV ("Selected Projects").
- **Role and credit are required.** Architecture is team work under a firm, and a project presented
  larger than her part in it is the failure most likely to be noticed — the reader may know the firm.
- **Clearance for firm work.** A practice's drawings belong to the practice. Publishing them without
  agreement can cost the reference she needs most, so professional projects need a verified clearance
  to appear anywhere. Chosen over a softer "warn only" because the cost of the mistake is outside the
  repository and cannot be rolled back by a revert.
- **A portfolio PDF.** Applications ask for one, usually under an upload limit, so it is generated
  from the same data as the site, landscape, with JPEG renditions (Chrome embeds JPEG as-is and
  re-encodes other formats losslessly, which would inflate it). The fixture's 15-sheet PDF is 1.3 MB.
- **Drawings are never cropped**, and sit on a light mat even in dark mode: cropping a plan or
  darkening a line drawing removes the information it carries.
- **Software is a required CV section**, because architecture roles are screened on it first.
- **Images get an import step** that downsizes originals (often tens of MB) and strips metadata — a
  phone photo of a client's house carries its GPS position.
- **Design**: a drawing-sheet idiom — sans text, monospaced labels like a title block, thin rules,
  one terracotta accent, the work at full width. The site is itself a sample of her eye.

**Where measurement changed the design.** Each of these was found by looking at the built artifact,
not by a green build:

1. Every project card showed a grey band under its image. `<Picture>` wraps the `<img>`, and the
   wrapper had no height, so `height: 100%` on the image resolved to nothing.
2. The CV PDF stranded the "Languages" heading at the foot of page 1, its content on page 2. Headings
   now avoid breaking after themselves, and the short blocks of split rows stay whole.
3. `npm run pdf` could not start its server while a review preview was running: Astro 7.4 locks
   `astro preview` to one instance per project. The PDF step now runs its own with `--ignore-lock`.
4. The inherited `tsconfig` used `baseUrl`, deprecated in TypeScript 6 and removed in 7, for path
   aliases nothing used. Removed rather than silenced.

**Guards proven by failing.** Each was run against a deliberately broken input before being trusted:
an assumed floor area and an assumed project year (both with plausible written justifications),
professional work with no clearance, a missing image file, an empty alt text, and a featured id naming
no project — all rejected by `npm run check` with exit 1 and the right path. A build in which the
uncleared project leaked was caught on every page by `check-dist` (the Person JSON-LD lists project
titles site-wide, so it leaked everywhere), and a sample build without `ALLOW_SAMPLE` was refused.

**Sample content was made impossible to publish, not merely labelled.** A banner on every page, a
build gate on the banner, a `robots.txt` that disallows everything, sample artifacts routed to a
git-ignored folder, and placeholder images generated rather than committed.

**Decisions taken the same day.** Hosting on a `<username>.github.io` user site, served from the root:
the shortest link for an application form, and the only layout in which `robots.txt` is read. The
base path moved from `/portfolio` to `''`, and `check-dist` confirmed every link followed. Contact is
email only: a public phone number on the open web invites calls nobody wants, and practices reply by
email. Commits will carry Amna's own name and email, read from her CV and confirmed first, so nothing
was committed under anyone else's identity in the meantime.

**Open at handover.** Her real profile and images; the GitHub username; which projects lead; the
roles she is targeting. Tracked in the private intake sheet.

## 2026-10-23 (later) — her real content, and scholarships as a second purpose

**Sources.** Two files arrived: her CV and her M.Arch thesis (Draft II, 313 pages). The CV turned out
to be a Photoshop export with no text layer — two characters of extractable text across two pages —
so an applicant-tracking system would read it as blank. The generated CVs fix that as a side effect.
The thesis was read in full where it carries facts: front matter, questions, method, sites, every
results section's conclusion, the recommendations and the appendices.

**Scholarships changed the shape, not just the content.** Nasik's brief added scholarships to jobs.
A panel reads differently from a practice: education and grades first, research as questions and
evidence, conferences and teaching as signs of a sustained interest. So: an academic CV variant, a
research layer on projects, a Research page, a research sheet in the portfolio PDF, and an
applications pack with word counts for form boxes. The pack gathers the facts and her own origin
story for a personal statement but deliberately does not write the statement: panels read for her
voice.

**Why the working documents left the repository.** The thesis draft disagrees with itself in ways a
reviewer would catch — four different survey sizes, a degree named M.Phil on its title page and
M.Arch everywhere else, charts without units. Writing that into a public repository under her name
would hand a reviewer the critique. The intake sheet, the applications pack and a hand-written thesis
review now live in a git-ignored `private/`, and the bases in the public data file stay neutral.

**What was deliberately not published.** No survey sample size (four conflicting figures; the
demographics appendix implies 30 per scheme). None of the activity charts (no units; text and chart
disagree in places). None of the LDA plans, estate-agent land-use maps or Google Mobility charts —
cited properly in a thesis, but not hers to present as her work. Her fieldwork photographs would be
the best image for the research page; none are in the thesis, so they are asked for.

**Where looking at the output changed things.** The academic CV ran to a third page for two lines —
resolved by dropping "References: available on request", which panels assume and which costs a page.
The site map was soft at desktop width because the responsive widths dropped every size above the
original; figures now always get their native width and are never stretched past it. "Lahore,
Lahore" appeared wherever an institution's name already held the city. The portfolio PDF printed a
contents page for one project and an approach sheet with nothing beside the text; both now skip.

**Settled at the close of the cycle.** The degree is the Master of Architecture — the "Master of
Philosophy" line on the thesis title page is not the degree — and the thesis has been submitted and is
awaiting defence, so both CVs read "2019–present, thesis submitted" with the award year left blank. No
photograph on the public site: the CV portrait was cropped as a candidate and deleted unpublished.
Commits carry her CV address, ar.amnabashir@gmail.com.

**Open, for the next cycle.** Confirmation of the remaining inferences (role cities, research
interests, the LinkedIn address); course, event and membership years; the 2017–2019 gap; what "(CAD)"
stands for; images from practice (with permission) and from the B.Arch thesis; her fieldwork
photographs; her GitHub username, then publishing.

## 2026-11-01 — the address, and getting ready to publish

**Access without her password.** Amna's account added Nasik's (`nasikabbas`) as a collaborator with
write access, and pushes go through his existing login. Her credentials never reach this machine,
and the commits are still authored under her name. The cost is that repository and Pages settings
stay owner-only, so those changes are made from her account.

**The address.** Her username is `amnabashir-94`, so the site is `https://amnabashir-94.github.io/`.
That one constant replaced the `.invalid` placeholder, and every surface the placeholder had kept
the address out of picked it up: canonical URLs, the sitemap, `robots.txt`, the JSON-LD, the CV
contact lines, the portfolio PDF's cover and closing sheet, and the LinkedIn pack. The five downloads
were regenerated and read. Both CVs stay at two pages and the portfolio at four sheets, and the
longer contact line fits on one line. `check-dist` was run in CI mode locally, where it refuses the
placeholder, and passed.

**What did not go to plan.**

- **The repository was created as `amnabashir`**, not `amnabashir-94.github.io`. GitHub serves that
  name as a project site under `/amnabashir/`. The repository was read through the API before
  anything was changed, which caught it. The other option was to keep the name and set `BASE_PATH`,
  but that gives a longer link that repeats her name and puts `robots.txt` where crawlers never read
  it. Nasik chose to rename the repository to match the decision on record.
- **The 0.2.0 release left `package-lock.json` at 0.1.0.** The bump was made by hand in
  `package.json`. It was found by reading the lock while preparing this release, and a rule against
  it already existed, so it got a mechanism, not another sentence: `scripts/check-version.ts` in
  `npm run check`. It was proven by failing twice: against the 0.2.0 files (lock behind) and after
  the 0.3.0 bump, before the changelog entry (changelog behind).
- **The LinkedIn pack ended the thesis credits with "UET Lahore.."**, from a full stop in the data
  plus one from the generator. It was found in the diff when the address changed.

**Found and left open.** Canonical URLs, internal links and the JSON-LD write page paths without a
trailing slash (`/about`), while the sitemap writes them with one (`/about/`). GitHub Pages answers
the slash-less form with a redirect, so it works, but canonical and sitemap should agree. The fix is
site-wide in `path()` (and `trailingSlash` in `astro.config.ts`), so it did not belong in the
publishing change.
