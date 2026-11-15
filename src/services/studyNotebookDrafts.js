import { notebookEntryKey } from '../utils/studyNotebook.js';
import { validateNotebookCommand } from '../utils/studyNotebookCommand.js';
import { NOTEBOOK_ENTRY_LIMIT, MAX_NOTEBOOK_ENTRY_BYTES } from '../data/studyNotebookLimits.js';

const prefix = 'quiz-notebook-pending-v1:';
const draftInput = (input) =>
  typeof input === 'string' && new TextEncoder().encode(input).length <= MAX_NOTEBOOK_ENTRY_BYTES;
/** Optional tab-local recovery, never shared between account keys. No auto-submit. */
export function createNotebookDraftStorage(storage = () => globalThis.sessionStorage) {
  return {
    async read(uid) {
      try {
        const saved = JSON.parse(storage()?.getItem(prefix + uid) || '[]');
        if (!Array.isArray(saved) || saved.length > NOTEBOOK_ENTRY_LIMIT) return {};
        const result = {};
        for (const item of saved) {
          try {
            const key = await notebookEntryKey(item.ref);
            if (
              !draftInput(item.input) ||
              !Number.isSafeInteger(item.base?.revision) ||
              item.base.revision < 0 ||
              !Number.isSafeInteger(item.base?.generation) ||
              item.base.generation < 0
            )
              continue;
            if (item.command) await validateNotebookCommand(item.command, uid);
            if (item.command && item.command.entryKey !== key) continue;
            result[key] = {
              ref: item.ref,
              input: item.input,
              base: item.base,
              command: item.command || null,
            };
          } catch {
            /* A corrupt local row must not discard other pending input. */
          }
        }
        return result;
      } catch {
        return {};
      }
    },
    write(uid, editors) {
      try {
        const rows = Object.values(editors)
          .filter((editor) => (editor.dirty || editor.command) && editor.base)
          .map(({ ref, input, base, command }) => ({ ref, input, base, command }));
        if (rows.length > NOTEBOOK_ENTRY_LIMIT || rows.some((row) => !draftInput(row.input)))
          return false;
        const target = storage();
        if (!target) return false;
        if (rows.length) target.setItem(prefix + uid, JSON.stringify(rows));
        else target.removeItem(prefix + uid);
        return true;
      } catch {
        return false;
      }
    },
  };
}
