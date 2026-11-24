import { useCallback, useEffect, useRef, useState } from 'react';
import service from '../services/certOutcomeService';
import studyRoadmapService from '../services/studyRoadmapService';
import { STUDY_ROADMAP_ENABLED } from '../config/studyRoadmapConfig';

export const outcomeMessage = (error) => {
  if (error?.outcomeCode === 'conflict')
    return 'This record changed. Refresh and review the latest version.';
  if (error?.outcomeCode === 'plan') return 'The selected study target is no longer available.';
  if (error?.outcomeCode === 'experience') return 'The public experience is too long.';
  if (
    error?.outcomeCode === 'denied' ||
    ['permission-denied', 'unauthenticated'].includes(error?.code)
  )
    return 'You do not have permission for this action.';
  return 'Could not complete the request. Please retry.';
};

export function useOutcomeRecords(uid) {
  const [rows, setRows] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planError, setPlanError] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);

  const reload = useCallback(async () => {
    const version = ++generation.current;
    setError(null);
    setLoading(true);
    if (STUDY_ROADMAP_ENABLED) {
      studyRoadmapService.list(uid).then(
        (targets) => {
          if (generation.current === version) {
            setPlans(targets);
            setPlanError(false);
          }
        },
        () => {
          if (generation.current === version) setPlanError(true);
        }
      );
    }
    try {
      const records = await service.list(uid, true);
      if (generation.current !== version) return null;
      setRows(
        records.sort((a, b) => b.examDate.localeCompare(a.examDate) || a.slot.localeCompare(b.slot))
      );
      return records;
    } catch (error) {
      if (generation.current === version) setError(error);
      return null;
    } finally {
      if (generation.current === version) setLoading(false);
    }
  }, [uid]);
  useEffect(() => {
    reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  return { rows, plans, planError, loading, error, reload };
}

export function useOutcomeWrite(uid) {
  const [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  const active = useRef(false),
    writing = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function write(method, command) {
    if (!active.current || writing.current) return false;
    writing.current = true;
    setBusy(true);
    setError(null);
    try {
      await service[method](uid, command);
      return active.current;
    } catch (failure) {
      if (active.current) setError(failure);
      return false;
    } finally {
      writing.current = false;
      if (active.current) setBusy(false);
    }
  }
  return { busy, error, write, clear: () => setError(null) };
}

export function useOutcomeFeed(status) {
  const [state, setState] = useState(null);
  const generation = useRef(0);
  const load = useCallback(
    async (after = null) => {
      const version = ++generation.current;
      setState((before) => ({ status, rows: after ? before?.rows || [] : [], loading: true }));
      try {
        const page = await (status
          ? service.moderationPage(status, after)
          : service.publicPage(after));
        if (generation.current === version)
          setState((before) => ({
            status,
            rows: [...before.rows, ...page.rows],
            next: page.next,
            loading: false,
          }));
      } catch (error) {
        if (generation.current === version)
          setState((before) => ({ ...before, next: after, loading: false, error }));
      }
    },
    [status]
  );
  useEffect(() => {
    load();
    return () => {
      generation.current++;
    };
  }, [load]);
  return state?.status === status && state ? { ...state, load } : { rows: [], loading: true, load };
}
