import { notebookSelection } from '../utils/studyNotebookSelection.js';
import { notebookError } from '../utils/studyNotebook.js';

const prefix = 'quiz-notebook-selection-v1:';
export function createNotebookSelectionStorage(storage = () => globalThis.sessionStorage) {
  const key = (uid, id) => prefix + uid + ':' + id;
  return {
    async save(uid, entries) {
      if (!uid) throw notebookError('AUTH');
      const selection = await notebookSelection(entries);
      try {
        storage().setItem(key(uid, selection.id), JSON.stringify(selection.manifest));
      } catch {
        throw notebookError('STORAGE');
      }
      return selection;
    },
    async read(uid, id) {
      if (!uid) throw notebookError('AUTH');
      if (typeof id !== 'string' || !/^[0-9a-f]{64}$/.test(id)) throw notebookError('INVALID');
      let entries;
      try {
        entries = JSON.parse(storage().getItem(key(uid, id)) || 'null');
      } catch {
        throw notebookError('STORAGE');
      }
      if (!entries) throw notebookError('MISSING');
      const selection = await notebookSelection(entries);
      if (selection.id !== id) throw notebookError('INVALID');
      return selection;
    },
  };
}
