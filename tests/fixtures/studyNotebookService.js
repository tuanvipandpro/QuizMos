import { validateNotebookCommand } from '../../src/utils/studyNotebookCommand.js';
import {
  notebookError,
  notebookSourceGroup,
  notebookStateFromEntry,
  notebookQuestionFingerprint,
  transitionNotebookState,
  validateNotebookEntry,
} from '../../src/utils/studyNotebook.js';
import { notebookQueryPlan } from '../../src/utils/studyNotebookQuery.js';

const storageKey = (uid) => 'quiz-e2e-notebook:' + uid;
const read = (uid) =>
  JSON.parse(
    localStorage.getItem(storageKey(uid)) ||
      '{"entries":{},"state":{"count":0,"revision":0,"generation":0}}'
  );
const write = (uid, data) => localStorage.setItem(storageKey(uid), JSON.stringify(data));
const owner = (uid) => {
  const account = JSON.parse(localStorage.getItem('quiz-e2e-auth') || 'null');
  if (!uid || account?.uid !== uid || account.isAnonymous) throw notebookError('AUTH');
};
async function before(method, uid, key = null) {
  owner(uid);
  (window.quizNotebookCalls ||= []).push({ method, uid, key });
  if (sessionStorage.getItem('quiz-e2e-notebook-defer:' + method))
    await new Promise((resolve) =>
      window.addEventListener('quiz-e2e-notebook-release:' + method, resolve, { once: true })
    );
  owner(uid);
  const failure = sessionStorage.getItem('quiz-e2e-notebook-error:' + method);
  if (failure) throw notebookError(failure);
  if (!navigator.onLine) throw notebookError('NETWORK');
}
export default {
  async state(uid) {
    await before('state', uid);
    return read(uid).state;
  },
  async get(uid, key) {
    await before('get', uid, key);
    const data = read(uid),
      entry = data.entries[key] || null;
    if (entry) await validateNotebookEntry(entry);
    return { entry, state: data.state };
  },
  async listPage(uid, filters, after) {
    await before('list', uid);
    const plan = notebookQueryPlan(filters, after);
    const cursor = after ? after.seconds * 1000 + after.nanoseconds / 1000000 : null;
    const entries = Object.values(read(uid).entries)
      .filter(
        (row) =>
          plan.equalities.every(([key, value]) => row[key] === value) &&
          (cursor === null ||
            row.updatedAt < cursor ||
            (row.updatedAt === cursor && row.entryKey < after.entryKey))
      )
      .sort((a, b) => b.updatedAt - a.updatedAt || (a.entryKey > b.entryKey ? -1 : 1))
      .slice(0, plan.limit);
    await Promise.all(entries.map(validateNotebookEntry));
    const last = entries.at(-1);
    return {
      entries,
      next:
        entries.length === plan.limit
          ? {
              seconds: Math.floor(last.updatedAt / 1000),
              nanoseconds: (last.updatedAt % 1000) * 1000000,
              entryKey: last.entryKey,
            }
          : null,
    };
  },
  async mutate(uid, command) {
    await before('mutate', uid, command.entryKey);
    await validateNotebookCommand(command, uid);
    owner(uid);
    const data = read(uid),
      old = data.entries[command.entryKey],
      marker = old || data.state;
    if (marker.lastOperationId === command.operationId) {
      if (marker.lastOperationFingerprint !== command.fingerprint) throw notebookError('CONFLICT');
      return { entry: old || null, state: data.state, replayed: true };
    }
    if (
      (old?.revision || 0) !== command.expectedRevision ||
      data.state.generation !== command.expectedGeneration
    )
      throw notebookError('CONFLICT');
    if (command.ref.kind === 'custom' && (!old || command.change.kind === 'outcome')) {
      const source = JSON.parse(localStorage.getItem('quiz-e2e-custom:' + uid) || '{}')[
        command.ref.slotId
      ];
      const q = source?.questions?.find((q) => String(q.id) === command.ref.questionId);
      if (
        !q ||
        source.instanceId !== command.ref.instanceId ||
        source.contentVersion !== command.ref.contentVersion ||
        (await notebookQuestionFingerprint(q)) !== command.ref.fingerprint
      )
        throw notebookError('SOURCE_CHANGED');
    }
    const now = Math.max(Date.now(), (old?.updatedAt || 0) + 1);
    const next = transitionNotebookState(old && notebookStateFromEntry(old), command.change, now);
    if (!old && !next) return { entry: null, state: data.state, noop: true };
    if (!old && data.state.count >= 500) throw notebookError('QUOTA');
    const markers = {
      lastOperationId: command.operationId,
      lastOperationFingerprint: command.fingerprint,
    };
    if (next)
      data.entries[command.entryKey] = await validateNotebookEntry({
        schemaVersion: 1,
        entryKey: command.entryKey,
        ref: command.ref,
        sourceGroup: notebookSourceGroup(command.ref),
        ...next,
        revision: (old?.revision || 0) + 1,
        ...markers,
        createdAt: old?.createdAt ?? now,
        updatedAt: now,
      });
    else delete data.entries[command.entryKey];
    data.state = {
      count: data.state.count + (next ? (old ? 0 : 1) : -1),
      revision: data.state.revision + 1,
      generation: data.state.generation + (next ? 0 : 1),
      lastEntryKey: command.entryKey,
      ...markers,
      updatedAt: now,
    };
    owner(uid);
    write(uid, data);
    if (sessionStorage.getItem('quiz-e2e-notebook-drop-response')) {
      sessionStorage.removeItem('quiz-e2e-notebook-drop-response');
      throw notebookError('NETWORK');
    }
    return { committed: true };
  },
};
