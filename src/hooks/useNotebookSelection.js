import { useState } from 'react';
import { createNotebookSelectionStorage } from '../services/studyNotebookSelectionStorage.js';

export function useNotebookSelection(notebook, onNavigate) {
  const [preparing, setPreparing] = useState(false),
    [error, setError] = useState(null);
  return {
    preparing,
    error,
    clearError: () => setError(null),
    async study(entries) {
      if (preparing) return;
      const owner = notebook.uid;
      setPreparing(true);
      setError(null);
      try {
        const selection = await createNotebookSelectionStorage().save(owner, entries);
        if (notebook.getSnapshot().uid === owner) onNavigate(`#/notebook/study/${selection.id}`);
      } catch (failure) {
        setError(failure);
      } finally {
        setPreparing(false);
      }
    },
  };
}
