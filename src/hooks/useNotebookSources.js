import { useEffect, useState } from 'react';
import { notebookSourceResolver } from '../services/studyNotebookSourceService';
import { createNotebookSelectionStorage } from '../services/studyNotebookSelectionStorage.js';
import { resolveNotebookSelection } from '../services/studyNotebookSources.js';
import { normalizeNotebookError } from '../utils/studyNotebookCommand.js';

export function useNotebookEntrySources(uid, entries, refreshToken = 0) {
  const key = entries.map((entry) => entry.entryKey).join(','),
    [state, setState] = useState(null);
  useEffect(() => {
    let active = true;
    if (!uid) return;
    const resolve = notebookSourceResolver();
    Promise.all(entries.map(async (entry) => [entry.entryKey, await resolve(uid, entry.ref)])).then(
      (values) => {
        if (active) setState({ uid, key, refreshToken, values: Object.fromEntries(values) });
      }
    );
    return () => {
      active = false;
    };
  }, [uid, key, refreshToken]);
  return state?.uid === uid && state.key === key && state.refreshToken === refreshToken
    ? state.values
    : {};
}

export function useNotebookRevision(uid, selectionId, enabled) {
  const [revision, setRevision] = useState(0),
    [state, setState] = useState(null);
  useEffect(() => {
    let active = true;
    if (!uid || !selectionId || !enabled) return;
    (async () => {
      try {
        const selection = await createNotebookSelectionStorage().read(uid, selectionId);
        const pool = await resolveNotebookSelection(
          uid,
          selection.manifest,
          notebookSourceResolver()
        );
        if (active) setState({ uid, selectionId, revision, selection, pool, error: null });
      } catch (error) {
        if (active)
          setState({
            uid,
            selectionId,
            revision,
            pool: null,
            error: normalizeNotebookError(error),
          });
      }
    })();
    return () => {
      active = false;
    };
  }, [uid, selectionId, enabled, revision]);
  const own =
    state?.uid === uid && state.selectionId === selectionId && state.revision === revision;
  return {
    ...(own ? state : { pool: null, error: null }),
    loading: !own,
    reload: () => setRevision((value) => value + 1),
  };
}
