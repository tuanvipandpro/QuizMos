import { useEffect, useMemo, useRef, useState } from 'react';
import { publicQuizRefreshUrl, probePublicQuizRefresh } from '../services/publicQuizRefresh.js';
export function usePublicQuizRefresh({ page, owner, routeHash, query, examActive }) {
  const context = useMemo(() => ({ owner, routeHash, query }), [owner, routeHash, query]);
  const active = page === 'library' && !examActive;
  const current = useRef({ context, active });
  current.current = { context, active };
  const request = useRef(null),
    mounted = useRef(true);
  const [state, setState] = useState({ context: null, status: 'idle' });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      request.current?.controller.abort();
      request.current = null;
    };
  }, []);
  useEffect(
    () => () => {
      if (request.current?.context === context) {
        request.current.controller.abort();
        request.current = null;
      }
    },
    [context, active]
  );
  const live = (item) =>
    mounted.current &&
    request.current === item &&
    !item.controller.signal.aborted &&
    current.current.active &&
    current.current.context === item.context;
  const refresh = async () => {
    if (!active || request.current) return;
    const item = { context, controller: new AbortController() };
    request.current = item;
    setState({ context, status: 'loading' });
    try {
      const url = publicQuizRefreshUrl(window.location.href, query);
      await probePublicQuizRefresh(url, { signal: item.controller.signal });
      if (live(item)) window.location.replace(url);
    } catch (error) {
      if (live(item) && error.name !== 'AbortError') setState({ context, status: 'error' });
    } finally {
      if (request.current === item) request.current = null;
    }
  };
  const view = state.context === context && active ? state.status : 'idle';
  return { refresh, loading: view === 'loading', error: view === 'error', disabled: !active };
}
