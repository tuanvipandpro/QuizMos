import { notebookEntryKey, notebookError } from '../utils/studyNotebook.js';
import { notebookFilters } from '../utils/studyNotebookQuery.js';
import { createNotebookCommand, normalizeNotebookError } from '../utils/studyNotebookCommand.js';
import { NOTEBOOK_ENTRY_LIMIT, NOTEBOOK_PAGE_SIZE } from '../data/studyNotebookLimits.js';

const empty = (uid) => ({
  uid,
  entries: [],
  filters: notebookFilters(),
  next: null,
  loading: false,
  error: null,
  quota: null,
  pageRevision: null,
  stale: false,
  editors: {},
  draftsSaved: true,
  ready: false,
});
const editorState = (ref) => ({
  ref,
  entry: null,
  base: null,
  input: '',
  dirty: false,
  command: null,
  loading: false,
  saving: false,
  status: 'idle',
  error: null,
});

export function createStudyNotebookStore(service, { drafts = null } = {}) {
  let state = empty(null),
    active = false,
    epoch = 0,
    pageRequest = 0;
  const editorRequests = new Map(),
    pending = new Map(),
    listeners = new Set();
  const current = (version) => active && epoch === version;
  const publish = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  const edit = (key, patch) => {
    const editors = { ...state.editors, [key]: { ...state.editors[key], ...patch } };
    publish({ editors, draftsSaved: drafts ? drafts.write(state.uid, editors) : false });
  };
  const requireActive = () => {
    if (!active || !state.ready) throw notebookError('AUTH');
  };
  async function loadEditor(ref, { refresh = false } = {}) {
    requireActive();
    const version = epoch,
      uid = state.uid,
      key = await notebookEntryKey(ref);
    if (!current(version)) throw notebookError('SESSION_CHANGED');
    const old = state.editors[key];
    if (old?.saving) throw notebookError('BUSY');
    if (!refresh && old?.base && !old.loading && old.status !== 'idle') return key;
    const token = (editorRequests.get(key) || 0) + 1;
    editorRequests.set(key, token);
    const live = () => current(version) && editorRequests.get(key) === token;
    if (!old) edit(key, editorState(ref));
    edit(key, { loading: true, error: null });
    try {
      const context = await service.get(uid, key);
      if (!live()) throw notebookError('SESSION_CHANGED');
      const latest = state.editors[key];
      const keepBase = !refresh && latest.dirty && latest.base;
      edit(key, {
        entry: context.entry,
        base: keepBase || {
          revision: context.entry?.revision || 0,
          generation: context.state.generation,
        },
        input: latest.dirty ? latest.input : context.entry?.note || '',
        command: refresh ? null : latest.command,
        loading: false,
        status: latest.command && !refresh ? 'error' : latest.dirty ? 'unsaved' : 'loaded',
        error: latest.command && !refresh ? notebookError('NETWORK') : null,
      });
      return key;
    } catch (error) {
      const failure = normalizeNotebookError(error);
      if (live()) edit(key, { loading: false, status: 'error', error: failure });
      throw failure;
    }
  }
  async function execute(key, command) {
    requireActive();
    const version = epoch,
      uid = state.uid;
    if (pending.has(key)) throw notebookError('BUSY');
    edit(key, { saving: true, status: 'saving', error: null, command });
    const task = Promise.resolve().then(async () => {
      try {
        const result = await service.mutate(uid, command);
        if (!current(version)) throw notebookError('SESSION_CHANGED');
        const context = await service.get(uid, key);
        if (!current(version)) throw notebookError('SESSION_CHANGED');
        const marker = context.entry || context.state;
        // No-op absent commands have no receipt. Every actual commit/replay
        // must still be current before the UI can report synchronization.
        if (
          !result.noop &&
          (marker.lastOperationId !== command.operationId ||
            marker.lastOperationFingerprint !== command.fingerprint)
        )
          throw notebookError('CONFLICT');
        const latest = state.editors[key],
          removed = command.change.kind === 'remove';
        const input = removed ? '' : latest.input;
        const dirty = removed ? false : input !== (context.entry?.note || '');
        edit(key, {
          entry: context.entry,
          base: { revision: context.entry?.revision || 0, generation: context.state.generation },
          input,
          dirty,
          saving: false,
          command: null,
          status: dirty ? 'unsaved' : 'saved',
          error: null,
        });
        publish({
          quota: context.state,
          stale: state.pageRevision !== null && state.pageRevision !== context.state.revision,
        });
        return context;
      } catch (error) {
        const failure = normalizeNotebookError(error);
        if (current(version)) edit(key, { saving: false, status: 'error', error: failure });
        throw failure;
      } finally {
        if (current(version)) pending.delete(key);
      }
    });
    pending.set(key, task);
    return task;
  }
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async activate(uid, enabled) {
      const next = !!uid && !!enabled;
      if (state.uid === (uid || null) && active === next) return;
      epoch++;
      pageRequest++;
      editorRequests.clear();
      pending.clear();
      active = next;
      const version = epoch;
      publish(empty(uid || null));
      if (!next) return;
      const recovered = drafts ? await drafts.read(uid) : {};
      if (!current(version)) return;
      const editors = Object.fromEntries(
        Object.entries(recovered).map(([key, saved]) => [
          key,
          { ...editorState(saved.ref), ...saved, dirty: true, status: 'idle' },
        ])
      );
      publish({ editors, ready: true });
    },
    open: loadEditor,
    refreshEditor: (ref) => loadEditor(ref, { refresh: true }),
    input(key, input) {
      requireActive();
      if (!state.editors[key] || typeof input !== 'string') throw notebookError('INVALID');
      edit(key, { input, dirty: input !== (state.editors[key].entry?.note || '') });
    },
    async change(key, change) {
      requireActive();
      const editor = state.editors[key],
        version = epoch,
        uid = state.uid;
      if (!editor?.base || editor.loading) throw notebookError('INVALID');
      if (editor.saving || editor.command) throw notebookError('BUSY');
      let command;
      try {
        command = await createNotebookCommand({
          owner: uid,
          ref: editor.ref,
          expectedRevision: editor.base.revision,
          expectedGeneration: editor.base.generation,
          change,
        });
      } catch (error) {
        const failure = normalizeNotebookError(error);
        if (current(version)) edit(key, { status: 'error', error: failure });
        throw failure;
      }
      if (!current(version)) throw notebookError('SESSION_CHANGED');
      return execute(key, command);
    },
    retry(key) {
      requireActive();
      const editor = state.editors[key];
      if (!editor?.command || !['NOTEBOOK_NETWORK', 'NOTEBOOK_DENIED'].includes(editor.error?.code))
        throw notebookError('CONFLICT');
      return execute(key, editor.command);
    },
    async loadPage(filters = state.filters, { append = false } = {}) {
      requireActive();
      const normalized = notebookFilters(filters),
        version = epoch,
        uid = state.uid,
        token = ++pageRequest;
      if (append && (!state.next || JSON.stringify(normalized) !== JSON.stringify(state.filters)))
        return;
      const live = () => current(version) && pageRequest === token;
      const after = append ? state.next : null;
      publish({
        filters: normalized,
        loading: true,
        error: null,
        ...(append ? {} : { entries: [], next: null, pageRevision: null }),
      });
      try {
        const before = await service.state(uid);
        if (!live()) return;
        if (append && before.revision !== state.pageRevision) throw notebookError('CONFLICT');
        const page = await service.listPage(uid, normalized, after);
        if (!live()) return;
        const latest = await service.state(uid);
        if (!live()) return;
        if (before.revision !== latest.revision) throw notebookError('CONFLICT');
        if (
          !Array.isArray(page.entries) ||
          page.entries.length > NOTEBOOK_PAGE_SIZE ||
          (page.next && page.entries.length !== NOTEBOOK_PAGE_SIZE)
        )
          throw notebookError('INVALID');
        const entries = [...(append ? state.entries : []), ...page.entries];
        if (
          entries.length > NOTEBOOK_ENTRY_LIMIT ||
          new Set(entries.map((row) => row.entryKey)).size !== entries.length
        )
          throw notebookError('INVALID');
        publish({
          entries,
          next: page.next,
          quota: latest,
          pageRevision: latest.revision,
          stale: false,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (live()) publish({ loading: false, error: normalizeNotebookError(error) });
      }
    },
  };
}
