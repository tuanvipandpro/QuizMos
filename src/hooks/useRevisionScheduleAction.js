import { useEffect, useRef, useState } from 'react';
import service from '../services/studyNotebookService';
import { createNotebookCommand, normalizeNotebookError } from '../utils/studyNotebookCommand.js';
import { notebookError } from '../utils/studyNotebook.js';

export function useRevisionScheduleAction(uid, saveSucceeded) {
  const [error, setError] = useState(null),
    [saving, setSaving] = useState(false);
  const live = useRef(false),
    busy = useRef(false),
    pending = useRef(null);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  async function save(entry, action) {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    setError(null);
    try {
      if (!pending.current) {
        const context = await service.get(uid, entry.entryKey);
        if (!live.current) return false;
        if (!context.entry?.mistake || context.entry.revision !== entry.revision)
          throw notebookError('CONFLICT');
        pending.current = await createNotebookCommand({
          owner: uid,
          ref: context.entry.ref,
          expectedRevision: context.entry.revision,
          expectedGeneration: context.state.generation,
          change: { kind: 'reviewSchedule', action },
        });
      }
      if (!live.current) return false;
      await service.mutate(uid, pending.current);
      pending.current = null;
      if (!live.current) return false;
      saveSucceeded();
      return true;
    } catch (failure) {
      if (live.current) setError(normalizeNotebookError(failure));
      return false;
    } finally {
      busy.current = false;
      if (live.current) setSaving(false);
    }
  }
  return {
    save,
    saving,
    error,
    clear: () => {
      pending.current = null;
      setError(null);
    },
  };
}
