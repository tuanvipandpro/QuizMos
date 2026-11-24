let enabled = false;
try {
  enabled = sessionStorage.getItem('quiz-e2e-spaced-revision') === '1';
} catch {
  /* Fail closed. */
}
export const SPACED_REVISION_ENABLED = enabled;
