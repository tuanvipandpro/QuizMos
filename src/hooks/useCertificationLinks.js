import { useCallback, useEffect, useRef, useState } from 'react';
import service from '../services/certificationLinkService';

export function certificationLinkMessage(error) {
  if (error?.certificationLinkCode === 'url')
    return 'Enter a valid HTTPS certificate or badge link.';
  if (error?.certificationLinkCode === 'conflict')
    return 'This link changed. Refresh and review the current link.';
  if (['permission-denied', 'unauthenticated'].includes(error?.code))
    return 'You do not have permission for this action.';
  return 'Could not complete the request. Please retry.';
}

export function useCertificationLinks(uid) {
  const [state, setState] = useState({ rows: [], loading: true });
  const version = useRef(0);
  const load = useCallback(
    async (after = null) => {
      const current = ++version.current;
      setState((before) => ({ ...before, loading: true, error: null, retry: null }));
      try {
        const page = uid ? { rows: await service.list(uid) } : await service.publicPage(after);
        if (current !== version.current) return null;
        setState((before) => ({
          ...page,
          rows: after
            ? [
                ...before.rows,
                ...page.rows.filter((entry) => !before.rows.some(({ id }) => id === entry.id)),
              ]
            : page.rows,
          loading: false,
        }));
        return page.rows;
      } catch (error) {
        if (current === version.current)
          setState((before) => ({ ...before, loading: false, error, retry: after }));
        return null;
      }
    },
    [uid]
  );
  useEffect(() => {
    load();
    return () => {
      version.current++;
    };
  }, [load]);
  return { ...state, load };
}

export function useCertificationLinkWrite(uid) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const pending = useRef(false);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const write = async (action, command) => {
    if (!active.current || pending.current) return false;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await service[action](uid, command);
      return active.current;
    } catch (failure) {
      if (active.current) setError(failure);
      return false;
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  };
  return { busy, error, write, clear: () => setError(null) };
}
