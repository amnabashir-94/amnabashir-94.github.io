import { z } from 'zod';

import { claim, strictClaim } from './claim';

/**
 * Schema for `data/profile.yaml` — the single source of truth for every generated artifact:
 * the site, the project pages, the portfolio PDF, every CV variant, the plain-text and LLM
 * surfaces, the LinkedIn pack and the intake sheet.
 *
 * Nothing downstream may introduce a fact that is not expressible here. If a renderer needs a
 * new fact, it is added to this schema first, so there is exactly one place to audit what the
 * world is being told about Amna and her work.
 */

/** A month-precision date, e.g. `2024-04`. Month precision is all a CV ever needs. */
const YearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected a YYYY-MM date, e.g. "2024-04".');

/** A four-digit year within a sane range for a working career. */
const Year = z.number().int().min(1950).max(2100);

/**
 * A project's period: one year, or a range — `2023`, `2022–2024`, `2025–ongoing`.
 * En dash only, so every rendered period looks the same.
 */
const ProjectPeriod = z
  .string()
  .regex(
    /^\d{4}(–(\d{4}|ongoing))?$/,
    'Expected "2023", "2022–2024" or "2025–ongoing" (with an en dash).',
  );

/** Stable kebab-case key. Appears in URLs and image folders, so never renamed once published. */
const Id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Expected a kebab-case id.');

/**
 * Tags let one CV bullet serve several variants without being rewritten.
 *
 * A variant selects and orders highlights by tag, so the underlying claim stays identical
 * across every document — the emphasis changes, never the facts. Differently-worded accounts
 * of the same job are how a candidate gets caught contradicting themselves in an interview.
 * The list follows the stages and specialisms architecture job descriptions are written in.
 */
export const HIGHLIGHT_TAGS = [
  'concept-design',
  'design-development',
  'construction-documents',
  'bim',
  'visualisation',
  'interior-design',
  'site-supervision',
  'client-liaison',
  'authority-approvals',
  'consultant-coordination',
  'urban-design',
  'sustainability',
  'research',
  'project-management',
  'teaching',
  'public-sector',
] as const;

export type HighlightTag = (typeof HIGHLIGHT_TAGS)[number];

const HighlightTagEnum = z.enum(HIGHLIGHT_TAGS);

/** One CV bullet, written once and reused across every variant that wants it. */
const Highlight = z.object({
  /** `verb + what + how + result`. The CV lint enforces the verb opener and the length cap. */
  text: z.string().min(20),
  /** Variants select and order bullets by these. At least one, or it can never surface. */
  tags: z.array(HighlightTagEnum).min(1),
  /** A quantifier for this bullet. Strict: an unconfirmed number cannot be written here at all. */
  metric: strictClaim(z.string().min(1)).optional(),
});

export type Highlight = z.infer<typeof Highlight>;

/** A position at a practice, a studio, a teaching post, or self-directed practice. */
const Role = z
  .object({
    id: Id,
    title: z.string().min(2),
    organisation: z.string().min(2),
    /** One line on the employer, so a reader knows the setting without guessing. */
    organisationContext: z.string().min(10),
    /** A claim: CVs often omit where a role was, and a guessed city is still a guess. */
    location: claim(z.string().min(2)),
    /** Absent only when `periodNote` explains why — see the refinement below. */
    start: YearMonth.optional(),
    /** Absent means ongoing; rendered as "Present". */
    end: YearMonth.optional(),
    /** Stands in for a date range, e.g. "Alongside full-time employment". */
    periodNote: z.string().min(10).optional(),
    /** Two-sentence framing shown on the site; CVs lead with highlights instead. */
    summary: z.string().min(40),
    highlights: z.array(Highlight).min(1),
    /** Ids of projects she worked on in this role, linked from the About page. */
    projects: z.array(Id).default([]),
  })
  .refine((role) => role.start !== undefined || role.periodNote !== undefined, {
    path: ['start'],
    error: 'A role without a start date must carry a periodNote explaining its absence.',
  });

export type Role = z.infer<typeof Role>;

/**
 * A professional registration — for an architect in Pakistan, the Pakistan Council of
 * Architects and Town Planners (PCATP). Year and number are strict: a credential is never
 * inferred. Optional as a list, because a recent graduate may not be registered yet, and
 * saying nothing is honest where an implied registration is not.
 */
const Registration = z.object({
  title: z.string().min(5),
  body: z.string().min(5),
  year: strictClaim(Year),
  number: strictClaim(z.string().min(1)).optional(),
});

/**
 * A qualification.
 *
 * `awardingBody` and `institution` are separate on purpose: the university that confers a
 * degree is the name a parser and an overseas recruiter recognise, even when the student
 * attended an affiliated school. The thesis is recorded because for an architect it is the
 * one project that is entirely her own.
 */
const Qualification = z.object({
  degree: z.string().min(3),
  awardingBody: z.string().min(3).optional(),
  institution: z.string().min(3),
  location: z.string().min(2),
  /**
   * `secondary` for school certificates (Matriculation, F.Sc, A-levels). Scholarship forms and
   * academic CVs in Pakistan ask for them; a professional CV for a practising architect does
   * not, so only academic variants render them.
   */
  level: z.enum(['higher', 'secondary']).default('higher'),
  /** Year studies began. Strict, like every date on a credential. */
  started: strictClaim(Year).optional(),
  /** Year completed. `missing` while the degree is in progress. */
  year: strictClaim(Year),
  /**
   * Where the degree stands. Scholarship eligibility often turns on it — many require the
   * previous degree to be complete — so it is stated rather than implied by a missing year.
   */
  status: claim(z.enum(['completed', 'in progress', 'thesis submitted'])).optional(),
  /** Marks or grade as stated on the transcript or CV: "80.7% · CGPA 3.67". Never inferred. */
  grade: strictClaim(z.string().min(2)).optional(),
  /** Thesis or final-year design project title, if any. */
  thesis: z.string().min(3).optional(),
  /** Id of the thesis project, when it is also a project page. */
  thesisProject: Id.optional(),
  /** Thesis supervisor, as named on the thesis. Academic CVs and referees need it. */
  supervisor: z.string().min(3).optional(),
  /** "Distinction", "Gold medal". Checkable, so never inferred. */
  distinction: strictClaim(z.string().min(2)).optional(),
});

/**
 * A course, module, specialisation or certificate.
 *
 * `via` is kept apart from `issuer` because the two are routinely confused on CVs: a course
 * *authorised by* Autodesk and *offered through* Coursera is not an Autodesk certification,
 * and a reader who checks will notice. The title is always the course's exact title.
 */
const Credential = z.object({
  title: z.string().min(3),
  kind: z.enum(['course', 'specialisation', 'module', 'certificate']).default('course'),
  /** The body that authored or authorised it. */
  issuer: z.string().min(3),
  /** The platform it was taken on, e.g. Coursera. */
  via: z.string().min(2).optional(),
  status: claim(z.enum(['completed', 'in progress'])),
  year: strictClaim(Year),
});

/** Conferences, workshops and lecture series — and what she did at each. */
export const EVENT_KINDS = [
  'conference',
  'workshop',
  'lecture series',
  'webinar',
  'training',
] as const;
export const EVENT_ROLES = [
  'organiser and participant',
  'speaker',
  'participant',
  'attendee',
] as const;

const Event = z.object({
  kind: z.enum(EVENT_KINDS),
  title: z.string().min(3),
  organiser: z.string().min(3),
  /** Where it was held, when that differs from the organiser. */
  venue: z.string().min(3).optional(),
  /** "Organiser" and "attendee" are different claims; the CV's verb decides which. */
  role: z.enum(EVENT_ROLES),
  /** As stated: "2–13 Aug 2020", "2021". Strict — undated events stay undated. */
  date: strictClaim(z.string().min(4)),
  /** Individual sessions, for a series of webinars. */
  sessions: z.array(z.string().min(3)).default([]),
});

export type Event = z.infer<typeof Event>;

/**
 * Awards, competition results, exhibitions and publications — the record of other people
 * judging the work, which is why each carries a strict year and a strict result.
 */
export const RECOGNITION_KINDS = ['award', 'competition', 'exhibition', 'publication'] as const;

const Recognition = z.object({
  kind: z.enum(RECOGNITION_KINDS),
  title: z.string().min(3),
  /** The body that judged, hosted or published it. */
  issuer: z.string().min(3),
  year: strictClaim(Year),
  /** "First prize", "Shortlisted", "Honourable mention". Never inferred. */
  result: strictClaim(z.string().min(2)).optional(),
  /** Id of the project it recognises, when there is one. */
  project: Id.optional(),
});

/** A group of competencies, ordered per CV variant by its tags. */
const CompetencyGroup = z.object({
  label: z.string().min(3),
  items: z.array(z.string().min(2)).min(2),
  tags: z.array(HighlightTagEnum).min(1),
});

/**
 * A group of software. Architecture roles are screened on software before anything else, so
 * it is a first-class section rather than a line under "skills".
 */
const SoftwareGroup = z.object({
  label: z.string().min(3),
  items: z.array(z.string().min(2)).min(1),
});

/** The three or four things a reader should retain from fifteen seconds on the homepage. */
const ProofPoint = z.object({
  label: z.string().min(3),
  text: z.string().min(40),
});

const Language = z.object({
  name: z.string().min(3),
  proficiency: z.string().min(4),
});

/**
 * What an image is. It decides how the image may be shown: a render or photograph can be
 * cropped to fill a card; a drawing, diagram or sheet never is, because cropping a plan
 * removes the part of it someone was going to read.
 */
export const IMAGE_KINDS = [
  'render',
  'photo',
  'model',
  'sketch',
  'drawing',
  'diagram',
  'sheet',
] as const;

export type ImageKind = (typeof IMAGE_KINDS)[number];

/** Kinds that must always be shown whole, never cropped. */
export const UNCROPPABLE_KINDS: ReadonlySet<ImageKind> = new Set(['drawing', 'diagram', 'sheet']);

const ProjectImage = z.object({
  /**
   * File name inside the project's image folder, `src/assets/projects/<project-id>/`.
   * `npm run images` writes web-sized copies there from the originals in source material.
   */
  file: z.string().regex(/^[a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp|avif)$/, {
    error: 'Expected a lower-case file name ending .jpg, .jpeg, .png, .webp or .avif.',
  }),
  /** Describes what the image shows, for a reader who cannot see it. Not a caption. */
  alt: z.string().min(10),
  /** Shown under the image, e.g. "Ground floor plan". */
  caption: z.string().min(2).optional(),
  kind: z.enum(IMAGE_KINDS),
  /** Whoever made it, when it was not Amna — a photographer, a visualiser, the firm. */
  credit: z.string().min(2).optional(),
});

export type ProjectImage = z.infer<typeof ProjectImage>;

/** Where a project came from. Decides whether publication needs a firm's clearance. */
export const PROJECT_CONTEXTS = ['academic', 'professional', 'competition', 'personal'] as const;

/** How far a project got. A claim, because "built" is exactly what gets checked. */
export const PROJECT_STATUSES = [
  'built',
  'under construction',
  'approved',
  'design stage',
  'unbuilt',
  'academic',
  'competition entry',
] as const;

/** A labelled paragraph: a method, a finding, a recommendation. */
const ResearchPoint = z.object({
  label: z.string().min(3),
  text: z.string().min(40),
});

/**
 * The research layer of a project, for theses and studies.
 *
 * A scholarship panel reads a thesis as research — questions, methods, evidence, findings —
 * not as a design project, so a research project carries these as structure rather than prose
 * buried in `approach`. Sample sizes are strict claims: they are the first number a reviewer
 * checks, and the first a draft gets wrong.
 */
const ProjectResearch = z.object({
  /** The degree it was written for: "M.Arch thesis". */
  degree: z.string().min(3),
  supervisor: z.string().min(3).optional(),
  questions: z.array(z.string().min(20)).min(1),
  methods: z.array(ResearchPoint).min(1),
  /** Respondent and interview counts. Rendered with the methods, only when verified. */
  sample: z
    .object({
      survey: strictClaim(z.string().min(2)),
      interviews: strictClaim(z.string().min(2)),
    })
    .partial()
    .optional(),
  /** Where the fieldwork happened. */
  sites: z.array(z.string().min(3)).default([]),
  findings: z.array(ResearchPoint).min(1),
  recommendations: z.array(ResearchPoint).default([]),
});

export type ProjectResearch = z.infer<typeof ProjectResearch>;

/**
 * A project — the unit an architect is judged on.
 *
 * Two fields carry the integrity of the whole portfolio. `role` states what Amna did on it,
 * because a firm's project presented as her own is the architecture equivalent of a
 * fabricated credential, and the reader may well know the firm. `clearance` records that the
 * firm agreed to the work being published; a professional project without a verified
 * clearance is validated and listed in the intake, but never rendered.
 */
const Project = z
  .object({
    id: Id,
    title: z.string().min(2),
    context: z.enum(PROJECT_CONTEXTS),
    /** The firm, university or competition organiser the work was done for or within. */
    organisation: z.string().min(2),
    /** What she did: "Design lead", "Part of a team of four; responsible for interiors". */
    role: claim(z.string().min(3)),
    /** Credit to others: lead architect, team, collaborators. Required for team work. */
    credits: z.string().min(3).optional(),
    period: strictClaim(ProjectPeriod),
    status: claim(z.enum(PROJECT_STATUSES)),
    location: claim(z.string().min(2)),
    typology: z.array(z.string().min(3)).min(1),
    /** Covered or site area, as written: "420 m²", "1 kanal". Strict: never estimated. */
    area: strictClaim(z.string().min(2)).optional(),
    /** One sentence for cards and the PDF contents page. */
    summary: z.string().min(30),
    /** The problem: client, site, programme, constraint. */
    brief: z.string().min(60),
    /** The design response, as paragraphs. */
    approach: z.array(z.string().min(60)).min(1),
    /** What happened: built, awarded, graded, learned. */
    outcome: z.string().min(30).optional(),
    software: z.array(z.string().min(2)).default([]),
    /** Image file used for cards, the page hero and the PDF opener. Must be in `images`. */
    cover: z.string(),
    images: z.array(ProjectImage).default([]),
    /** Firm's agreement to publish. Required for professional work; see the refinement. */
    clearance: strictClaim(z.string().min(10)).optional(),
    /** Present for theses and studies: questions, methods, findings, recommendations. */
    research: ProjectResearch.optional(),
    /** Validated but never rendered: a project still being written up. */
    draft: z.boolean().default(false),
  })
  .refine((p) => p.draft || p.images.length > 0, {
    path: ['images'],
    error: 'A published project needs at least one image. Mark it `draft: true` until it has one.',
  })
  .refine((p) => p.images.some((image) => image.file === p.cover) || p.images.length === 0, {
    path: ['cover'],
    error: 'The cover must be one of the project images.',
  })
  .refine((p) => p.context !== 'professional' || p.clearance !== undefined, {
    path: ['clearance'],
    error:
      'Professional work must record publication clearance — `state: missing` until the firm ' +
      'has agreed. It stays off the site until then.',
  });

export type Project = z.infer<typeof Project>;

/**
 * A targeted CV build.
 *
 * Variants differ in framing and ordering only. `leadTags` drives which highlights surface
 * first; `keywords` are the role-native terms the summary is written around, so a semantic
 * ranker sees genuine overlap rather than a keyword block.
 */
const Variant = z.object({
  id: Id,
  label: z.string().min(3),
  /**
   * `academic` reorders the whole document for scholarship and admissions panels: education
   * with grades first, then the research, teaching, conferences and courses, then practice.
   * `professional` leads with experience, the way a practice reads a CV.
   */
  kind: z.enum(['professional', 'academic']).default('professional'),
  /** Basename for the generated files, without extension. */
  filename: z.string().regex(/^[A-Za-z0-9-]+$/),
  /** The title line under the name, in the language of the roles being targeted. */
  headline: z.string().min(5),
  /** Job titles this variant is aimed at; recorded so the intent stays legible later. */
  targetTitles: z.array(z.string().min(3)).min(1),
  summary: z.string().min(200),
  /** Highlight tags in priority order. Other bullets follow after. */
  leadTags: z.array(HighlightTagEnum).min(1),
  /** Bullets kept per role. A CV is a case, not an archive; the site carries the record. */
  maxHighlightsPerRole: z.number().int().min(2).max(8).default(4),
  /** Competency groups kept, most relevant first. */
  maxCompetencyGroups: z.number().int().min(2).max(8).default(4),
  keywords: z.array(z.string().min(3)).min(4),
});

export type Variant = z.infer<typeof Variant>;

const Person = z.object({
  name: z.string().min(2),
  /** Short professional title: "Architect", "Architect & Interior Designer". */
  headline: z.string().min(5),
  /**
   * The one sentence the homepage opens with: what she does and for whom, in a reader's
   * words. A reader who stops after it should still have the right idea.
   */
  statement: z.string().min(40).max(220),
  email: z.email(),
  /** Optional, and shown only when present: a public phone number is her call to make. */
  phone: z.string().min(8).optional(),
  location: z.object({
    city: z.string().min(2),
    country: z.string().min(2),
    /** ISO 3166-1 alpha-2, for JSON-LD `addressCountry`. */
    countryCode: z.string().length(2),
  }),
  /** Availability line shown on the site. Kept honest and current. */
  availability: z.string().min(10),
  links: z.object({
    linkedin: claim(z.url()),
    instagram: claim(z.url()).optional(),
    behance: claim(z.url()).optional(),
    issuu: claim(z.url()).optional(),
    website: claim(z.url()).optional(),
  }),
});

/**
 * Her research profile, for the Research page, the academic CV and the applications pack.
 *
 * `interests` is a claim because it is a statement about her intentions: read off a thesis and
 * a list of courses, it is an inference until she says these are the questions she wants to
 * pursue next — and a scholarship statement built on someone else's guess at that is hollow.
 */
const Research = z.object({
  /** A short research profile, as paragraphs. */
  summary: z.array(z.string().min(80)).min(1),
  interests: claim(z.array(z.string().min(3)).min(2)),
  /** How the research question arose, in her own account. Raw material for a personal statement. */
  motivation: z.string().min(80).optional(),
});

export const ProfileSchema = z
  .object({
    /**
     * True only for the layout fixture in `data/sample/`. Every page then carries a banner,
     * and `check-dist` refuses to pass a build containing it unless sample mode was asked
     * for, so sample content cannot be deployed as Amna's.
     */
    sample: z.boolean().default(false),
    person: Person,
    /** Positioning paragraphs. The first is reused as the JSON-LD description. */
    about: z.array(z.string().min(80)).min(2),
    /** Project ids leading the homepage and making up the portfolio PDF, in order. */
    featured: z.array(Id).min(1),
    projects: z.array(Project).min(1),
    experience: z.array(Role).default([]),
    education: z.array(Qualification).min(1),
    registrations: z.array(Registration).default([]),
    certifications: z.array(Credential).default([]),
    events: z.array(Event).default([]),
    recognition: z.array(Recognition).default([]),
    research: Research.optional(),
    proofPoints: z.array(ProofPoint).min(3),
    competencies: z.array(CompetencyGroup).min(2),
    software: z.array(SoftwareGroup).min(1),
    languages: z.array(Language).min(1),
    variants: z.array(Variant).min(1),
  })
  .superRefine((profile, ctx) => {
    // Cross-references are checked here, once, so no renderer has to cope with a dangling id.
    const ids = new Set<string>();
    profile.projects.forEach((project, i) => {
      if (ids.has(project.id)) {
        ctx.addIssue({
          code: 'custom',
          path: ['projects', i, 'id'],
          message: `Duplicate project id "${project.id}".`,
        });
      }
      ids.add(project.id);
    });
    const known = (id: string, path: (string | number)[]): void => {
      if (!ids.has(id))
        ctx.addIssue({ code: 'custom', path, message: `No project with id "${id}".` });
    };
    profile.featured.forEach((id, i) => known(id, ['featured', i]));
    profile.experience.forEach((role, r) =>
      role.projects.forEach((id, i) => known(id, ['experience', r, 'projects', i])),
    );
    profile.recognition.forEach(
      (item, i) => item.project && known(item.project, ['recognition', i, 'project']),
    );
    profile.education.forEach(
      (q, i) => q.thesisProject && known(q.thesisProject, ['education', i, 'thesisProject']),
    );
    if (!profile.variants.some((variant) => variant.id === 'general')) {
      ctx.addIssue({
        code: 'custom',
        path: ['variants'],
        message: 'A variant with id "general" is required: it is the default CV.',
      });
    }
  });

export type Profile = z.infer<typeof ProfileSchema>;
