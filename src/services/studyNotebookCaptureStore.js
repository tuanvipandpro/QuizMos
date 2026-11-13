import { notebookEntryKey, notebookError } from '../utils/studyNotebook.js';
import { createNotebookCommand, normalizeNotebookError } from '../utils/studyNotebookCommand.js';
import { NOTEBOOK_ENTRY_LIMIT } from '../data/studyNotebookLimits.js';
import { secureId } from '../utils/secureId.js';

const empty = (uid = null) => ({
  uid,
  jobId: null,
  ready: false,
  status: 'idle',
  completed: 0,
  pendingCount: 0,
  retryableCount: 0,
  unboundCount: 0,
  error: null,
});

export function createNotebookCaptureStore(service, journal) {
  let state = empty(),
    record = null,
    epoch = 0,
    enabled = false,
    tail = Promise.resolve();
  let activation = Promise.resolve();
  const listeners = new Set();
  const publish = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((fn) => fn());
  };
  const current = (version) => enabled && epoch === version;
  const persist = (value = record) => {
    if (!journal.write(value)) throw notebookError('STORAGE');
  };
  const progress = () => ({
    completed: record.done.length,
    pendingCount: record.pending.length,
    retryableCount: record.pending.filter(
      (item) =>
        item.ref &&
        !['SOURCE_CHANGED', 'SOURCE_UNAVAILABLE', 'REFERENCE_SIZE', 'INVALID', 'SIZE'].includes(
          item.error
        )
    ).length,
    unboundCount: record.pending.filter((item) => item.ref && !item.command).length,
  });
  const status = () =>
    publish({
      ...progress(),
      status: record.pending.length ? 'error' : record.started ? 'saved' : 'idle',
      error: record.pending.length
        ? notebookError(record.pending.find((item) => item.error)?.error || 'NETWORK')
        : null,
    });
  const queue = (operation) => {
    const task = tail.then(operation);
    tail = task.catch(() => {});
    return task;
  };
  async function process(version, ids, refresh) {
    if (!current(version)) return;
    publish({ status: 'saving', error: null });
    for (const id of ids) {
      if (!current(version)) return;
      const item = record.pending.find((event) => event.id === id);
      if (!item) continue;
      try {
        if (!item.ref) throw notebookError(item.error || 'SOURCE_UNAVAILABLE');
        if (refresh) item.command = null;
        if (!item.command) {
          const key = await notebookEntryKey(item.ref);
          const context = await service.get(record.owner, key);
          if (!current(version)) return;
          item.command = await createNotebookCommand({
            owner: record.owner,
            ref: item.ref,
            operationId: refresh ? secureId() : item.id,
            expectedRevision: context.entry?.revision || 0,
            expectedGeneration: context.state.generation,
            change: item.change,
          });
        }
        if (!current(version)) return;
        item.error = null;
        // Persist the immutable command before IO. Automatic capture fails
        // visibly if recovery storage is unavailable; answers remain local.
        persist();
        const result = await service.mutate(record.owner, item.command);
        if (!current(version)) return;
        const context = await service.get(record.owner, item.command.entryKey);
        if (!current(version)) return;
        const marker = context.entry || context.state;
        if (
          !result.noop &&
          (marker.lastOperationId !== item.command.operationId ||
            marker.lastOperationFingerprint !== item.command.fingerprint)
        )
          throw notebookError('CONFLICT');
        const completed = [...record.done, id];
        const next = {
          ...record,
          done: record.kind === 'practice' ? completed.slice(-NOTEBOOK_ENTRY_LIMIT) : completed,
          pending: record.pending.filter((event) => event.id !== id),
        };
        persist(next);
        record = next;
      } catch (error) {
        if (!current(version)) return;
        const failure = normalizeNotebookError(error);
        item.error = failure.code.replace(/^NOTEBOOK_/, '');
        // Best effort error status; the command was persisted before any write.
        journal.write(record);
      }
    }
    if (current(version)) status();
  }
  return {
    getSnapshot: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    activate(uid, nextEnabled, jobId, kind) {
      const next = !!uid && !!nextEnabled && !!jobId;
      if (state.uid === (uid || null) && state.jobId === (jobId || null) && enabled === next)
        return activation;
      epoch++;
      enabled = next;
      record = null;
      tail = Promise.resolve();
      const version = epoch;
      publish({ ...empty(uid || null), jobId: jobId || null });
      activation = (async () => {
        if (!next) return;
        const recovered = await journal.read(uid, jobId, kind);
        if (!current(version)) return;
        record = recovered || { owner: uid, jobId, kind, started: false, done: [], pending: [] };
        publish({ ready: true });
        status();
      })();
      return activation;
    },
    async practice(prepare) {
      const version = epoch;
      if (!enabled) return;
      await activation;
      return queue(async () => {
        if (!current(version)) return;
        try {
          const event = await prepare();
          if (
            !current(version) ||
            !event ||
            record.done.includes(event.id) ||
            record.pending.some((item) => item.id === event.id)
          )
            return;
          if (record.pending.length >= NOTEBOOK_ENTRY_LIMIT) throw notebookError('QUOTA');
          record.started = true;
          record.pending.push(event);
          await process(version, [event.id], false);
        } catch (error) {
          if (current(version))
            publish({
              status: 'error',
              ...progress(),
              error: normalizeNotebookError(error),
            });
        }
      });
    },
    async exam(prepare, { refresh = false } = {}) {
      const version = epoch;
      if (!enabled) return;
      await activation;
      return queue(async () => {
        if (!current(version) || record.started) return;
        try {
          const events = await prepare();
          if (!current(version)) return;
          if (events.length > 100) throw notebookError('SIZE');
          record.started = true;
          record.pending = events;
          persist();
          await process(
            version,
            events.map((item) => item.id),
            refresh
          );
        } catch (error) {
          if (current(version))
            publish({
              status: 'error',
              ...progress(),
              error: normalizeNotebookError(error),
            });
        }
      });
    },
    async retry({ refresh = false } = {}) {
      const version = epoch;
      if (!enabled) return;
      await activation;
      return queue(() =>
        current(version)
          ? process(
              version,
              record.pending.map((item) => item.id),
              refresh
            )
          : undefined
      );
    },
  };
}
