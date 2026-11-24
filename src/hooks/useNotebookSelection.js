import { useEffect, useRef, useState } from 'react';
import { createNotebookSelectionStorage } from '../services/studyNotebookSelectionStorage.js';

export function useNotebookSelection(notebook, onNavigate) {
  const [preparing, setPreparing] = useState(false),
    [error, setError] = useState(null);
  const live = useRef(false);
  const pending = useRef(false);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  return {
    preparing,
    error,
    clearError: () => setError(null),
    async study(entries, params) {
      if (pending.current) return;
      pending.current = true;
      const owner = notebook.uid;
      setPreparing(true);
      setError(null);
      try {
        const selection = await createNotebookSelectionStorage().save(owner, entries);
        if (live.current && notebook.getSnapshot().uid === owner)
          onNavigate(
            `#/notebook/study/${selection.id}` + (params ? '?' + new URLSearchParams(params) : '')
          );
      } catch (failure) {
        if (live.current) setError(failure);
      } finally {
        pending.current = false;
        if (live.current) setPreparing(false);
      }
    },
  };
}
