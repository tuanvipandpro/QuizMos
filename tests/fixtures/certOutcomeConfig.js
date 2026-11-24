export const CERT_OUTCOMES_ENABLED = sessionStorage.getItem('quiz-e2e-outcomes-enabled') === '1';
export const CERT_OUTCOME_SHARING_ENABLED =
  CERT_OUTCOMES_ENABLED && sessionStorage.getItem('quiz-e2e-outcomes-sharing') === '1';
