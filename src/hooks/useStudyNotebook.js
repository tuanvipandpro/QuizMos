import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { STUDY_NOTEBOOK_ENABLED } from '../config/studyNotebookConfig';
import service from '../services/studyNotebookService';
import { createStudyNotebookStore } from '../services/studyNotebookStore.js';
import { createNotebookDraftStorage } from '../services/studyNotebookDrafts.js';

/** Mounted once by App; shared with notebook/question tools through props. */
export function useStudyNotebook(uid) {
  const store = useMemo(
    () => createStudyNotebookStore(service, { drafts: createNotebookDraftStorage() }),
    []
  );
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => {
    store.activate(uid, STUDY_NOTEBOOK_ENABLED);
    return () => {
      store.activate(null, false);
    };
  }, [store, uid]);
  const own = state.uid === (uid || null);
  useEffect(() => {
    const unsaved =
      STUDY_NOTEBOOK_ENABLED &&
      state.uid === uid &&
      Object.values(state.editors).some((editor) => editor.dirty || editor.command);
    if (!unsaved) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state.editors, state.uid, uid]);
  return {
    ...store,
    ...state,
    enabled: STUDY_NOTEBOOK_ENABLED,
    ...(!own
      ? { entries: [], editors: {}, quota: null, next: null, ready: false, error: null }
      : {}),
  };
}
