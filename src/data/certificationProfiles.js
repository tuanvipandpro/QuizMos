import { canonicalQuizId } from './quizAliases.js';

// Public reviewed facts, not an official grading engine. Unknowns stay null.
export const CERTIFICATION_SOURCES = Object.freeze({
  anthropic: 'https://anthropic-partners.skilljar.com/page/faq-certifications',
  ccarf:
    'https://anthropic-partners.skilljar.com/claude-certified-architect-foundations-certification',
  ccaof:
    'https://anthropic-partners.skilljar.com/claude-certified-associate-foundations-certification',
  ccdvp:
    'https://cc.sj-cdn.net/instructor/6nizmqk8tpzpfjvt6qmmav7rh/public/1794947325/Claude_Certified_Developer-Professional_Exam_Guide.pdf',
  program: 'https://www.pearsonvue.com/us/en/anthropic.html',
  ace: 'https://cloud.google.com/learn/certification/cloud-engineer',
  paa: 'https://cloud.google.com/learn/certification/agentic-architect',
  pca: 'https://cloud.google.com/learn/certification/cloud-architect',
  pcd: 'https://cloud.google.com/learn/certification/cloud-developer',
  pde: 'https://cloud.google.com/learn/certification/data-engineer',
  gal: 'https://cloud.google.com/learn/certification/generative-ai-leader',
  googleScore: 'https://support.google.com/cloud-certification/answer/9438208?hl=en',
  az900: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/',
  gh300: 'https://learn.microsoft.com/en-us/credentials/certifications/github-copilot/',
  gh300Score:
    'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-300',
  gh600: 'https://learn.microsoft.com/en-us/credentials/certifications/agentic-ai-developer/',
  gh600Score:
    'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/gh-600',
  ab100: 'https://learn.microsoft.com/en-us/credentials/certifications/exams/ab-100/',
  ab730: 'https://learn.microsoft.com/en-us/credentials/certifications/exams/ab-730/',
  ab731: 'https://learn.microsoft.com/en-us/credentials/certifications/exams/ab-731/',
  ai103:
    'https://learn.microsoft.com/en-us/credentials/certifications/azure-ai-apps-and-agents-developer-associate/',
  dp800:
    'https://learn.microsoft.com/en-us/credentials/certifications/developing-ai-enabled-database-solutions/',
  dp800Score:
    'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/dp-800',
  microsoftScore: 'https://learn.microsoft.com/certifications/exam-scoring-reports',
  microsoftFormat:
    'https://learn.microsoft.com/en-us/credentials/support/exam-duration-exam-experience',
  saa: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/',
  saaScore:
    'https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-associate-03/solutions-architect-associate-03.html',
  dva: 'https://docs.aws.amazon.com/aws-certification/latest/developer-associate-02/developer-associate-02.html',
  dvaTransition:
    'https://docs.aws.amazon.com/aws-certification/latest/developer-associate-03/developer-associate-03.html',
  dea: 'https://aws.amazon.com/certification/certified-data-engineer-associate/',
  deaScore:
    'https://docs.aws.amazon.com/aws-certification/latest/data-engineer-associate-01/data-engineer-associate-01.html',
  aip: 'https://aws.amazon.com/certification/certified-generative-ai-developer-professional/',
  aipScore:
    'https://docs.aws.amazon.com/aws-certification/latest/ai-professional-01/ai-professional-01.html',
  ctfl: 'https://istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/',
  ctai1: 'https://istqb.org/certifications/certified-tester-ai-testing-ct-ai-retiring/',
  ctai2: 'https://istqb.org/certifications/certified-tester-ai-testing-ct-ai/',
  ctal: 'https://istqb.org/certifications/certified-tester-advanced-level-test-analyst/',
  istqbTables: 'https://istqb.org/?download_id=3832&sdm_process_download=1',
});

const scaled = (threshold, minimum = 100) => ({
  kind: 'scaled',
  threshold,
  minimum,
  maximum: 1000,
});
const points = (threshold, maximum) => ({ kind: 'points', threshold, minimum: 0, maximum });
const unknownScore = (kind) => ({ kind, threshold: null, minimum: null, maximum: null });
const profile = (quizId, code, min, max, minutes, score, sources, extra = {}) =>
  Object.freeze({
    schemaVersion: 1,
    quizId,
    code,
    phase: 'standard',
    revision: '2026-11-14',
    reviewedAt: '2026-11-14',
    count: Object.freeze({
      kind: min === null ? 'unknown' : min === max ? 'exact' : 'range',
      min,
      max,
    }),
    minutes,
    score: Object.freeze(score),
    formats: Object.freeze(['multiple_choice']),
    versionConfirmed: true,
    effectiveUntil: null,
    seatMinutes: null,
    notes: Object.freeze([]),
    sources: Object.freeze(sources),
    ...extra,
  });

// Microsoft Learn certification requirements as of 2026-11-24.
export const AB_100_ASSOCIATE_CERTIFICATIONS = Object.freeze([
  'AI-103 — Azure AI Apps and Agents Developer',
  'AB-620 — AI Agent Builder',
  'AI-300 — Machine Learning Operations Engineer',
  'AB-410 — Intelligent Applications Builder',
  'PL-400 — Power Platform Developer',
  'AB-210 — Dynamics 365 Sales AI Consultant',
  'AB-250 — Dynamics 365 Contact Center AI Engineer',
  'MB-330 — Supply Chain Management Functional Consultant',
  'MB-310 — Finance Functional Consultant',
  'MB-230 — Customer Service Functional Consultant',
  'MB-500 — Finance and Operations Apps Developer',
  'MB-800 — Business Central Functional Consultant',
  'MB-820 — Business Central Developer',
]);

export const certificationProfiles = Object.freeze([
  profile('anthropic-cca-f', 'CCAR-F', 60, 60, 120, scaled(720), ['ccarf', 'anthropic'], {
    seatMinutes: 135,
  }),
  profile('anthropic-ccar-p', 'CCAR-P', null, null, 120, scaled(720), ['program', 'anthropic']),
  profile('anthropic-ccao-f', 'CCAO-F', 60, 60, 120, scaled(720), ['ccaof', 'anthropic']),
  profile('anthropic-ccdv-f', 'CCDV-F', null, null, 120, scaled(720), ['program', 'anthropic']),
  profile('anthropic-ccdv-p', 'CCDV-P', 70, 70, 120, scaled(720), ['ccdvp'], {
    revision: '2026-11-22',
    reviewedAt: '2026-11-22',
  }),
  profile('gcp-ace', 'ACE', 50, 60, 120, unknownScore('undisclosed'), ['ace', 'googleScore']),
  profile('gcp-paa', 'PAA', 50, 60, 120, unknownScore('undisclosed'), ['paa', 'googleScore'], {
    notes: Object.freeze(['PAA certification also requires a separate hands-on lab stage.']),
  }),
  profile('gcp-pca', 'PCA', 50, 60, 120, unknownScore('undisclosed'), ['pca', 'googleScore'], {
    notes: Object.freeze([
      'Official case-study and domain coverage is not reproduced by random question selection.',
    ]),
  }),
  profile('gcp-pcd', 'PCD', 50, 60, 120, unknownScore('undisclosed'), ['pcd', 'googleScore']),
  profile('gcp-pcde', 'PDE', 40, 50, 120, unknownScore('undisclosed'), ['pde', 'googleScore']),
  profile('gcp-gal', 'GAL', 50, 60, 90, unknownScore('undisclosed'), ['gal', 'googleScore']),
  profile(
    'az-900',
    'AZ-900',
    null,
    null,
    45,
    scaled(700, 1),
    ['az900', 'microsoftFormat', 'microsoftScore'],
    { formats: null }
  ),
  profile('gh-300', 'GH-300', null, null, 100, scaled(700, 1), ['gh300', 'gh300Score'], {
    formats: null,
  }),
  profile('gh-600', 'GH-600', null, null, 120, scaled(700, 1), ['gh600', 'gh600Score'], {
    formats: null,
  }),
  profile(
    'ab-100',
    'AB-100',
    null,
    null,
    null,
    scaled(700, 1),
    ['ab100', 'microsoftFormat', 'microsoftScore'],
    { formats: null }
  ),
  profile('ab-730', 'AB-730', null, null, 45, scaled(700, 1), ['ab730', 'microsoftScore'], {
    formats: null,
    revision: '2026-11-16',
    reviewedAt: '2026-11-16',
  }),
  profile('ab-731', 'AB-731', null, null, 45, scaled(700, 1), ['ab731', 'microsoftScore'], {
    formats: null,
    revision: '2026-11-16',
    reviewedAt: '2026-11-16',
  }),
  profile('ai-103', 'AI-103', null, null, 120, scaled(700, 1), ['ai103', 'microsoftScore'], {
    formats: null,
  }),
  profile('dp-800', 'DP-800', null, null, 120, scaled(700, 1), ['dp800', 'dp800Score'], {
    formats: null,
    revision: '2026-11-26',
    reviewedAt: '2026-11-26',
  }),
  profile('aws-saa', 'SAA-C03', 65, 65, 130, scaled(720), ['saa', 'saaScore']),
  profile('aws-dva', 'DVA-C02', 65, 65, 130, scaled(720), ['dva', 'dvaTransition'], {
    reviewedAt: '2026-11-15',
    effectiveUntil: '2026-11-30',
    notes: Object.freeze([
      'This bank remains DVA-C02. Its announced last delivery date is 30 November 2026.',
    ]),
  }),
  profile('aws-dea', 'DEA-C01', 65, 65, 130, scaled(720), ['dea', 'deaScore']),
  profile('aws-aip-c01', 'AIP-C01', 75, 75, 180, scaled(750), ['aip', 'aipScore'], {
    reviewedAt: '2026-11-15',
  }),
  profile('istqb-ctfl-v4-0', 'CTFL v4.0', 40, 40, 60, points(26, 40), ['ctfl', 'istqbTables']),
  profile(
    'istqb-ct-ai',
    'CT-AI',
    40,
    40,
    60,
    unknownScore('unverified'),
    ['ctai1', 'ctai2', 'istqbTables'],
    {
      versionConfirmed: false,
      notes: Object.freeze([
        'The bank syllabus version is unverified. CT-AI v1 and v2 have different point thresholds.',
      ]),
    }
  ),
  profile('istqb-ctal-ta-v4-0', 'CTAL-TA v4.0', 45, 45, 120, points(51, 78), [
    'ctal',
    'istqbTables',
  ]),
]);

export const getCertificationProfile = (id) =>
  certificationProfiles.find((item) => item.quizId === canonicalQuizId(id)) || null;
