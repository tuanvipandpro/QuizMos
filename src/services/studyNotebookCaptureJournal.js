import { NOTEBOOK_ENTRY_LIMIT } from '../data/studyNotebookLimits.js';
import { validateNotebookCommand } from '../utils/studyNotebookCommand.js';
import {
  validateNotebookReference,
  transitionNotebookState,
  notebookEntryKey,
} from '../utils/studyNotebook.js';
import { UUID_PATTERN } from '../utils/secureId.js';

const prefix = 'quiz-notebook-capture-v1:';
const validId = (id) => typeof id === 'string' && UUID_PATTERN.test(id);
/** Bounded per-session tab journal: references/outcomes/commands, never questions. */
export function createNotebookCaptureJournal(storage = () => globalThis.sessionStorage) {
  const key = (uid, jobId) => prefix + uid + ':' + jobId;
  return {
    async read(uid, jobId, kind) {
      try {
        const data = JSON.parse(storage()?.getItem(key(uid, jobId)) || 'null');
        if (
          !data ||
          data.owner !== uid ||
          data.jobId !== jobId ||
          data.kind !== kind ||
          typeof data.started !== 'boolean' ||
          !Array.isArray(data.done) ||
          !Array.isArray(data.pending) ||
          data.done.length > NOTEBOOK_ENTRY_LIMIT ||
          data.pending.length > NOTEBOOK_ENTRY_LIMIT ||
          !data.done.every(validId)
        )
          return null;
        const seen = new Set(data.done);
        for (const item of data.pending) {
          if (!validId(item.id) || seen.has(item.id)) return null;
          seen.add(item.id);
          if (
            item.ref === null &&
            item.change === null &&
            item.command === null &&
            ['REFERENCE_SIZE', 'SOURCE_UNAVAILABLE', 'SOURCE_CHANGED', 'INVALID', 'SIZE'].includes(
              item.error
            )
          )
            continue;
          validateNotebookReference(item.ref);
          if (item.change?.kind !== 'outcome') return null;
          transitionNotebookState(null, item.change, 0);
          if (item.command) {
            await validateNotebookCommand(item.command, uid);
            if (
              item.command.entryKey !== (await notebookEntryKey(item.ref)) ||
              item.command.change.kind !== 'outcome' ||
              item.command.change.correct !== item.change.correct
            )
              return null;
          }
        }
        return data;
      } catch {
        return null;
      }
    },
    write(record) {
      try {
        const target = storage();
        if (!target) return false;
        target.setItem(key(record.owner, record.jobId), JSON.stringify(record));
        return true;
      } catch {
        return false;
      }
    },
  };
}
