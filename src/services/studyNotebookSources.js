import { findQuiz } from '../data/quizzes.js';
import {
  createNotebookReference,
  notebookEntryKey,
  notebookError,
  validateNotebookReference,
} from '../utils/studyNotebook.js';
import { validateQuizQuestions } from '../utils/questionModel.js';
import { NOTEBOOK_ENTRY_LIMIT } from '../data/studyNotebookLimits.js';

/** One resolver per explicit load/refresh: share bank/slot IO inside that load. */
export function createNotebookSourceResolver({ loadBank, loadPrivate }) {
  const cache = new Map();
  return async (uid, ref) => {
    validateNotebookReference(ref);
    if (!uid) throw notebookError('AUTH');
    const id = ref.kind === 'bank' ? `bank:${ref.quizId}` : `${uid}:${ref.slotId}`;
    try {
      if (!cache.has(id))
        cache.set(
          id,
          (async () => {
            if (ref.kind === 'bank') {
              const bank = findQuiz(ref.quizId);
              if (!bank) return null;
              const questions = await loadBank(bank);
              if (!questions) return null;
              validateQuizQuestions(questions, { allowLegacyIncomplete: true });
              return { ...bank, kind: 'bank', questions };
            }
            return loadPrivate(uid, ref.slotId);
          })()
        );
      const quiz = await cache.get(id);
      if (!quiz) return { state: 'missing' };
      if (ref.kind === 'custom') {
        if (quiz.owner !== uid) return { state: 'unavailable' };
        if (quiz.instanceId !== ref.instanceId) return { state: 'replaced' };
        if (quiz.contentVersion !== ref.contentVersion || quiz.invalid) return { state: 'changed' };
      }
      const question = quiz.questions.find((item) => String(item.id) === ref.questionId);
      if (!question) return { state: 'missing' };
      const current = await createNotebookReference(quiz, question, uid);
      if (current.fingerprint !== ref.fingerprint) return { state: 'changed' };
      return { state: 'current', quiz, question };
    } catch {
      return { state: 'unavailable' };
    }
  };
}

export async function resolveNotebookSelection(uid, manifest, resolve) {
  if (!Array.isArray(manifest) || !manifest.length || manifest.length > NOTEBOOK_ENTRY_LIMIT)
    throw notebookError('INVALID');
  const seen = new Set(),
    current = [],
    excluded = [];
  for (const item of manifest) {
    if ((await notebookEntryKey(item.ref)) !== item.entryKey || seen.has(item.entryKey))
      throw notebookError('INVALID');
    seen.add(item.entryKey);
    const result = await resolve(uid, item.ref);
    if (result.state === 'current')
      current.push({ entryKey: item.entryKey, ref: item.ref, ...result });
    else excluded.push({ entryKey: item.entryKey, ref: item.ref, state: result.state });
  }
  // Preserve the manifest's stable ordering and original question objects/IDs.
  return {
    current,
    excluded,
    questions: current.map((item) => item.question),
    sources: current.map((item) => item.quiz),
  };
}
