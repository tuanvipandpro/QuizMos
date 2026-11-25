// Enable public certificate links after compatible Rules verification.
export const CERT_OUTCOMES_ENABLED = import.meta.env.VITE_CERT_OUTCOMES_ENABLED === 'true';
export const CERT_OUTCOME_SHARING_ENABLED =
  CERT_OUTCOMES_ENABLED && import.meta.env.VITE_CERT_OUTCOME_SHARING_ENABLED === 'true';
