import { useEffect, useMemo, useState } from 'react';
import service from '../services/studyNotebookService';
import { notebookSourceResolver } from '../services/studyNotebookSourceService';
import { loadSpacedRevision } from '../services/spacedRevisionQueue.js';
import { classifyRevisions } from '../utils/spacedRevision.js';
import { normalizeNotebookError } from '../utils/studyNotebookCommand.js';

export function useSpacedRevision(uid, bankId) {
  const [state, setState] = useState(null);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let active = true;
    if (!uid) return;
    loadSpacedRevision(service, notebookSourceResolver(), uid, bankId, () => active).then(
      (rows) => {
        if (active) setState({ uid, bankId, revision, rows });
      },
      (error) => {
        if (active) setState({ uid, bankId, revision, error: normalizeNotebookError(error) });
      }
    );
    return () => {
      active = false;
    };
  }, [uid, bankId, revision]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const current = state?.uid === uid && state?.bankId === bankId && state?.revision === revision;
  const rows = current ? state.rows : null;
  const queue = useMemo(
    () => (rows ? classifyRevisions(rows.entries, rows.sources, now) : null),
    [rows, now]
  );
  return {
    queue,
    now,
    loading: !!uid && !current,
    error: current ? state.error : null,
    reload: () => {
      setNow(Date.now());
      setRevision((value) => value + 1);
    },
  };
}
