import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { STUDY_NOTEBOOK_ENABLED } from '../config/studyNotebookConfig';
import { notebookError } from '../utils/studyNotebook.js';
import service from '../services/studyNotebookService';
import { createNotebookCaptureStore } from '../services/studyNotebookCaptureStore.js';
import { createNotebookCaptureJournal } from '../services/studyNotebookCaptureJournal.js';
import {
  canCaptureNotebook,
  notebookCaptureEvent,
  notebookExamEvents,
} from '../utils/studyNotebookCapture.js';

export function useNotebookCapture(session, quiz, uid, kind) {
  const store = useMemo(
    () => createNotebookCaptureStore(service, createNotebookCaptureJournal()),
    []
  );
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const eligible = STUDY_NOTEBOOK_ENABLED && canCaptureNotebook(session, uid);
  const jobId = session.notebook?.sessionId || null;
  const previousSubmitted = useRef(!!session.submitted);
  const beganSubmitted = useRef(!!session.submitted);
  useEffect(() => {
    store.activate(uid, eligible, jobId, kind);
    return () => {
      store.activate(null, false, null, kind);
    };
  }, [store, uid, eligible, jobId, kind]);
  useEffect(() => {
    const terminalTransition = !!session.submitted && !previousSubmitted.current;
    previousSubmitted.current = !!session.submitted;
    // Restoring an already-completed draft never starts a new capture. A
    // persisted partial job offers explicit retry, preserving command versions.
    if (kind === 'exam' && terminalTransition && eligible)
      store.exam(() => notebookExamEvents(session, quiz, uid));
  }, [store, kind, eligible, session.submitted, quiz, uid]);
  const own = state.uid === (uid || null) && state.jobId === jobId;
  const needsCapture =
    own &&
    eligible &&
    kind === 'exam' &&
    beganSubmitted.current &&
    session.submitted &&
    state.ready &&
    state.status === 'idle';
  return {
    ...(own ? state : { ready: false, status: 'idle', completed: 0, pendingCount: 0, error: null }),
    enabled: STUDY_NOTEBOOK_ENABLED,
    eligible,
    needsCapture,
    ...(needsCapture ? { status: 'error', error: notebookError('UNCONFIRMED') } : {}),
    practice(question, answer, eventId) {
      if (eligible)
        store.practice(() => notebookCaptureEvent(quiz, question, answer, uid, eventId));
    },
    retry(options = {}) {
      if (!eligible) return;
      if (kind === 'exam' && session.submitted && !state.pendingCount && state.status !== 'saved')
        return store.exam(() => notebookExamEvents(session, quiz, uid), { refresh: true });
      return store.retry(options);
    },
  };
}
