import { secureId, UUID_PATTERN } from './secureId.js';
import { contentHash } from './contentHash.js';
import { createNotebookReference, notebookAnswerChange } from './studyNotebook.js';
import { normalizeNotebookError } from './studyNotebookCommand.js';

export function notebookSession(uid, enabled, sessionId = null) {
  return enabled && uid
    ? { version: 1, owner: uid, sessionId: sessionId || secureId(), revision: 0 }
    : null;
}

export function canCaptureNotebook(session, uid) {
  const value = session?.notebook;
  return (
    !!uid &&
    value?.version === 1 &&
    value.owner === uid &&
    typeof value.sessionId === 'string' &&
    UUID_PATTERN.test(value.sessionId) &&
    Number.isSafeInteger(value.revision) &&
    value.revision >= 0
  );
}

export async function notebookCaptureEvent(quiz, question, answer, uid, id = secureId()) {
  const change = notebookAnswerChange(question, answer);
  if (!change) return null;
  return {
    id,
    ref: await createNotebookReference(quiz, question, uid),
    change,
    command: null,
    error: null,
  };
}

export async function notebookExamEvents(session, quiz, uid) {
  if (!session?.submitted || !canCaptureNotebook(session, uid)) return [];
  const events = [];
  for (const [index, question] of session.questions.entries()) {
    // Stable event identity across StrictMode/reload, separate from a command's
    // explicitly refreshable expected versions. No answer payload is retained.
    const hash = await contentHash(`${session.notebook.sessionId}:${String(question.id)}`);
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
    try {
      const event = await notebookCaptureEvent(quiz, question, session.answers[index], uid, id);
      if (event) events.push(event);
    } catch (error) {
      // An unsupported reference must not prevent other eligible questions
      // from being captured. Keep only its bounded event ID/error metadata.
      events.push({
        id,
        ref: null,
        change: null,
        command: null,
        error: normalizeNotebookError(error).code.replace(/^NOTEBOOK_/, ''),
      });
    }
  }
  return events;
}
