import { useEffect, useMemo, useState } from 'react';
import { createQuickPracticeStorage } from '../services/quickPracticeStorage.js';
import { questionFingerprint } from '../utils/studySession.js';

export function useQuickPractice({
  enabled,
  uid,
  sourceId,
  questions,
  size,
  fresh,
  identities = null,
}) {
  const service = useMemo(() => createQuickPracticeStorage(), [uid]);
  const signature = useMemo(() => (questions ? questionFingerprint(questions) : null), [questions]);
  const key = JSON.stringify([uid || null, sourceId, signature, size, fresh, identities]);
  const [state, setState] = useState(null);
  useEffect(() => {
    if (!enabled || !questions) return;
    try {
      const result = service.resolve({
        uid,
        sourceId,
        questions,
        size,
        fresh: fresh || null,
        identities,
      });
      setState({ key, result, error: null });
    } catch (error) {
      setState({ key, result: null, error });
    }
  }, [service, enabled, key]);
  return enabled && state?.key === key
    ? { ...state, loading: false }
    : { result: null, error: null, loading: !!enabled };
}
