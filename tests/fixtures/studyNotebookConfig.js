// Loopback fixture only; never a build-time production activation mechanism.
export const STUDY_NOTEBOOK_ENABLED =
  ['127.0.0.1', 'localhost'].includes(location.hostname) &&
  sessionStorage.getItem('quiz-e2e-notebook-enabled') === '1';
