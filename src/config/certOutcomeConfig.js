// Roll out private storage and moderated sharing separately after compatible Rules verification.
export const CERT_OUTCOMES_ENABLED = import.meta.env.VITE_CERT_OUTCOMES_ENABLED === 'true';
export const CERT_OUTCOME_SHARING_ENABLED =
  CERT_OUTCOMES_ENABLED && import.meta.env.VITE_CERT_OUTCOME_SHARING_ENABLED === 'true';
