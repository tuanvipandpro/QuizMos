import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  notebookSession,
  canCaptureNotebook,
  notebookCaptureEvent,
  notebookExamEvents,
} from '../src/utils/studyNotebookCapture.js';
import { createNotebookCaptureStore } from '../src/services/studyNotebookCaptureStore.js';
import { createNotebookCaptureJournal } from '../src/services/studyNotebookCaptureJournal.js';
import { notebookError } from '../src/utils/studyNotebook.js';
import { createExamSession, finishExam, questionFingerprint } from '../src/utils/studySession.js';
import {
  emptyAnswer,
  isAnswerCorrect,
  isStructuredQuestion,
  questionParts,
  partOptions,
} from '../src/utils/questionModel.js';

const uuid = '50000000-0000-4000-8000-000000000001';
const example = (name) =>
  JSON.parse(
    fs.readFileSync(new URL(`../public/examples/quiz-${name}.json`, import.meta.url), 'utf8')
  )[0];
const kinds = [
  'single',
  'multiple',
  'yes-no',
  'dropdown-rows',
  'dropdown-inline',
  'drag-drop-rows',
  'drag-drop-inline',
];
const bank = (questions) => ({ kind: 'bank', id: 'gcp-ace', questions });
const correct = (q) =>
  isStructuredQuestion(q) ? { ...q.answer } : q.answer.length === 1 ? q.answer[0] : [...q.answer];
const wrong = (q) => {
  if (isStructuredQuestion(q)) {
    const id = questionParts(q)[0].id;
    return {
      ...q.answer,
      [id]: Object.keys(partOptions(q, id)).find((key) => key !== q.answer[id]),
    };
  }
  const incorrect = Object.keys(q.options).find((key) => !q.answer.includes(key));
  return q.answer.length === 1 ? incorrect : [...q.answer.slice(0, -1), incorrect];
};

function fixture() {
  const saved = new Map(),
    rows = new Map(),
    calls = [];
  const data = { count: 0, revision: 0, generation: 0 };
  const journal = createNotebookCaptureJournal(() => ({
    getItem: (key) => saved.get(key) || null,
    setItem: (key, value) => saved.set(key, value),
  }));
  const service = {
    async get(uid, key) {
      return { entry: structuredClone(rows.get(uid + key) || null), state: { ...data } };
    },
    async mutate(uid, command) {
      calls.push(command);
      assert.equal(uid, command.owner);
      const key = uid + command.entryKey,
        old = rows.get(key);
      if (
        old?.lastOperationId === command.operationId &&
        old.lastOperationFingerprint === command.fingerprint
      )
        return { entry: old, state: data, replayed: true };
      if (
        command.expectedGeneration !== data.generation ||
        command.expectedRevision !== (old?.revision || 0)
      )
        throw notebookError('CONFLICT');
      rows.set(key, {
        revision: (old?.revision || 0) + 1,
        lastOperationId: command.operationId,
        lastOperationFingerprint: command.fingerprint,
      });
      if (!old) data.count++;
      data.revision++;
      return { committed: true };
    },
  };
  return {
    service,
    journal,
    saved,
    rows,
    calls,
    data,
    store: createNotebookCaptureStore(service, journal),
  };
}

test('capture eligibility is additive; old drafts/guests and running Exams never generate a batch', async () => {
  const q = example('single');
  assert.equal(notebookSession('alice', false, uuid), null);
  assert.equal(notebookSession(null, true, uuid), null);
  assert.equal(canCaptureNotebook({ answers: [q.answer] }, 'alice'), false);
  assert.equal(
    canCaptureNotebook({ notebook: notebookSession('alice', true, uuid) }, 'bob'),
    false
  );
  assert.equal(
    canCaptureNotebook({ notebook: notebookSession('alice', true, uuid) }, 'alice'),
    true
  );
  const old = createExamSession([q], 1, 60, { now: 1 });
  old.answers = [q.answer];
  assert.deepEqual(await notebookExamEvents(finishExam(old, 1000, true), bank([q]), 'alice'), []);
  const current = { ...old, notebook: notebookSession('alice', true, uuid) };
  assert.deepEqual(await notebookExamEvents(current, bank([q]), 'alice'), []);
});

test('all seven formats use shared completion/grading; terminal event IDs survive reload without changing the exam', async () => {
  for (const kind of kinds) {
    const q = example(kind),
      source = bank([q]);
    assert.equal(await notebookCaptureEvent(source, q, emptyAnswer(q), 'alice'), null);
    const passed = await notebookCaptureEvent(source, q, correct(q), 'alice');
    assert.equal(passed.change.correct, true);
    const incorrect = wrong(q);
    assert.equal(isAnswerCorrect(q, incorrect), false);
    const failure = await notebookCaptureEvent(source, q, incorrect, 'alice');
    assert.equal(failure.change.correct, false);
    const session = {
      ...createExamSession([q], 1, 60, { now: 1, random: () => 0.25 }),
      notebook: notebookSession('alice', true, uuid),
      answers: [incorrect],
      flags: [0],
    };
    const terminal = finishExam(session, session.deadline);
    const before = structuredClone(terminal);
    const a = await notebookExamEvents(terminal, source, 'alice');
    const b = await notebookExamEvents(JSON.parse(JSON.stringify(terminal)), source, 'alice');
    assert.deepEqual(a, b);
    assert.equal(a.length, 1);
    assert.deepEqual(terminal, before);
    assert.equal(terminal.signature, questionFingerprint([q]));
    assert.equal(terminal.deadline, session.deadline);
    assert.equal(terminal.endReason, 'expired');
  }
});

test('terminal batch is deduplicated under repeated effects and reload; journal contains no source question/answer payload', async () => {
  const f = fixture(),
    q = example('single'),
    event = await notebookCaptureEvent(bank([q]), q, correct(q), 'alice');
  await f.store.activate('alice', true, uuid, 'exam');
  await Promise.all([f.store.exam(async () => [event]), f.store.exam(async () => [event])]);
  assert.equal(f.calls.length, 1);
  assert.equal(f.store.getSnapshot().status, 'saved');
  assert.equal(f.store.getSnapshot().completed, 1);
  const another = createNotebookCaptureStore(f.service, f.journal);
  await another.activate('alice', true, uuid, 'exam');
  await another.exam(async () => [event]);
  assert.equal(f.calls.length, 1);
  const serialized = [...f.saved.values()].join('');
  assert.equal(serialized.includes('"options"'), false);
  assert.equal(serialized.includes('"answers"'), false);
  assert.equal(serialized.includes(q.question), false);
});

test('partial batch completion survives reload; response-loss retry keeps the original command and skips successful questions', async () => {
  const f = fixture(),
    q = example('single'),
    source = bank([q]);
  const events = [];
  for (let i = 0; i < 3; i++) {
    const question = { ...q, id: `batch-${i}` };
    events.push(await notebookCaptureEvent(bank([question]), question, correct(question), 'alice'));
  }
  const mutate = f.service.mutate;
  let lose = true;
  f.service.mutate = async (uid, cmd) => {
    const result = await mutate(uid, cmd);
    if (cmd.ref.questionId === 'batch-1' && lose) {
      lose = false;
      throw notebookError('NETWORK');
    }
    return result;
  };
  await f.store.activate('alice', true, uuid, 'exam');
  await f.store.exam(async () => events);
  assert.equal(f.store.getSnapshot().completed, 2);
  assert.equal(f.store.getSnapshot().pendingCount, 1);
  assert.equal(f.store.getSnapshot().status, 'error');
  const failed = f.calls[1],
    fresh = createNotebookCaptureStore(f.service, f.journal);
  await fresh.activate('alice', true, uuid, 'exam');
  await fresh.exam(async () => {
    throw new Error('No automatic re-preparation');
  });
  assert.equal(f.calls.length, 3);
  await fresh.retry();
  assert.equal(f.calls.length, 4);
  assert.deepEqual(f.calls[3], failed);
  assert.equal(f.data.count, 3);
  assert.equal(f.data.revision, 3);
  assert.equal(fresh.getSnapshot().status, 'saved');
  assert.equal(source.kind, 'bank');
});

test('stale capture remains conflicted after deletion; only an explicit refresh creates a fresh operation/generation', async () => {
  const f = fixture(),
    q = example('single');
  const event = await notebookCaptureEvent(bank([q]), q, correct(q), 'alice');
  const mutate = f.service.mutate;
  f.service.mutate = async () => {
    throw notebookError('NETWORK');
  };
  await f.store.activate('alice', true, uuid, 'practice');
  await f.store.practice(async () => event);
  const original = (await f.journal.read('alice', uuid, 'practice')).pending[0].command;
  f.data.generation++;
  f.service.mutate = mutate;
  await f.store.retry();
  assert.equal(f.store.getSnapshot().error.code, 'NOTEBOOK_CONFLICT');
  assert.equal(f.calls[0].expectedGeneration, 0);
  await f.store.retry({ refresh: true });
  assert.equal(f.calls[1].expectedGeneration, 1);
  assert.notEqual(f.calls[1].operationId, original.operationId);
  assert.equal(f.store.getSnapshot().status, 'saved');
});

test('recovery storage denial prevents an unjournaled automatic write; account changes suppress late completion', async () => {
  const f = fixture(),
    q = example('single'),
    event = await notebookCaptureEvent(bank([q]), q, correct(q), 'alice');
  const denied = createNotebookCaptureStore(f.service, {
    read: async () => null,
    write: () => false,
  });
  await denied.activate('alice', true, uuid, 'practice');
  await denied.practice(async () => event);
  assert.equal(f.calls.length, 0);
  assert.equal(denied.getSnapshot().error.code, 'NOTEBOOK_STORAGE');
  let release;
  const gate = new Promise((done) => {
    release = done;
  });
  const mutate = f.service.mutate;
  f.service.mutate = async (...args) => {
    await gate;
    return mutate(...args);
  };
  await f.store.activate('alice', true, uuid, 'practice');
  const pending = f.store.practice(async () => event);
  await new Promise((done) => setImmediate(done));
  await f.store.activate('bob', true, '50000000-0000-4000-8000-000000000002', 'practice');
  release();
  await pending;
  assert.equal(f.calls[0].owner, 'alice');
  assert.equal(f.store.getSnapshot().uid, 'bob');
  assert.equal(f.store.getSnapshot().status, 'idle');
  assert.equal(f.store.getSnapshot().completed, 0);
});

test('one unsupported Exam reference preserves its failure while other final questions capture and remain done after reload', async () => {
  const f = fixture(),
    a = { ...example('single'), id: 'valid-reference' },
    b = { ...a, id: 'x'.repeat(1025) };
  const source = bank([a, b]);
  const session = {
    notebook: notebookSession('alice', true, uuid),
    submitted: true,
    questions: [a, b],
    answers: [correct(a), correct(b)],
  };
  const events = await notebookExamEvents(session, source, 'alice');
  assert.equal(events.length, 2);
  assert.equal(events[1].ref, null);
  assert.equal(events[1].error, 'REFERENCE_SIZE');
  await f.store.activate('alice', true, uuid, 'exam');
  await f.store.exam(async () => events);
  assert.equal(f.calls.length, 1);
  assert.equal(f.store.getSnapshot().completed, 1);
  assert.equal(f.store.getSnapshot().pendingCount, 1);
  assert.equal(f.store.getSnapshot().retryableCount, 0);
  assert.equal(f.store.getSnapshot().error.code, 'NOTEBOOK_REFERENCE_SIZE');
  const restored = createNotebookCaptureStore(f.service, f.journal);
  await restored.activate('alice', true, uuid, 'exam');
  await restored.exam(async () => events);
  assert.equal(f.calls.length, 1);
  assert.equal(restored.getSnapshot().completed, 1);
  assert.equal(restored.getSnapshot().error.code, 'NOTEBOOK_REFERENCE_SIZE');
});

test('an initial Exam journal failure retains a visible unbound retry and can recover only as an explicit fresh action', async () => {
  const f = fixture(),
    q = example('single'),
    event = await notebookCaptureEvent(bank([q]), q, correct(q), 'alice');
  let writable = false;
  const store = createNotebookCaptureStore(f.service, {
    read: f.journal.read,
    write: (record) => writable && f.journal.write(record),
  });
  await store.activate('alice', true, uuid, 'exam');
  await store.exam(async () => [event]);
  assert.equal(f.calls.length, 0);
  assert.equal(store.getSnapshot().pendingCount, 1);
  assert.equal(store.getSnapshot().retryableCount, 1);
  assert.equal(store.getSnapshot().unboundCount, 1);
  assert.equal(store.getSnapshot().error.code, 'NOTEBOOK_STORAGE');
  writable = true;
  await store.retry({ refresh: true });
  assert.equal(f.calls.length, 1);
  assert.notEqual(f.calls[0].operationId, event.id);
  assert.equal(store.getSnapshot().status, 'saved');
});
