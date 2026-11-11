// Public build-time rollout control, not authorization. Enable only after verified policy.
// The verified frontend release injects this value; unset or non-exact values stay disabled.
export const EXAM_HISTORY_ENABLED = import.meta.env.VITE_EXAM_HISTORY_ENABLED === 'true';
