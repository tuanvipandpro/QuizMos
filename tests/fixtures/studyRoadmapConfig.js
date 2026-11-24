let enabled = false;
try {
  enabled = sessionStorage.getItem('quiz-e2e-roadmap-enabled') === '1';
} catch {
  /* Fail closed. */
}
export const STUDY_ROADMAP_ENABLED = enabled;
