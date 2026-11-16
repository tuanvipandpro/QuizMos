import { readStudySession } from './studySession.js';
import { examSetupFromParams, resolveExamSettings } from './studySettings.js';

/** Restore before parsing new choices: URLs cannot extend a saved deadline. */
export function examStartup(storage, key, questions, quizId, params, day) {
  const saved = readStudySession(storage, key, questions, 'exam');
  const fresh = params.get('fresh');
  if (saved && (!fresh || saved.freshToken === fresh || Number(fresh) < Number(saved.freshToken)))
    return { restored: saved, plan: null };
  return {
    restored: null,
    plan: resolveExamSettings({
      quizId,
      questions,
      ...examSetupFromParams(params, quizId, questions, day),
      day,
    }),
  };
}
