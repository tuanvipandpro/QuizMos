import { readCustomQuiz } from '../../src/utils/customQuizModel.js';
import { createNotebookSourceResolver } from '../../src/services/studyNotebookSources.js';

export function notebookSourceResolver() {
  return createNotebookSourceResolver({
    async loadBank(bank) {
      const response = await fetch(import.meta.env.BASE_URL + bank.file, { cache: 'no-store' });
      return response.ok ? response.json() : null;
    },
    async loadPrivate(uid, slot) {
      if (JSON.parse(localStorage.getItem('quiz-e2e-auth') || 'null')?.uid !== uid)
        throw new Error('Fixture owner changed');
      const current = JSON.parse(localStorage.getItem('quiz-e2e-custom:' + uid) || '{}')[slot];
      return current ? readCustomQuiz(slot, current, uid) : null;
    },
  });
}
