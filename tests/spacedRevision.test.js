import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyRevisions, getRevisionSchedule } from '../src/utils/spacedRevision.js';
import { transitionNotebookState } from '../src/utils/studyNotebook.js';
import { loadSpacedRevision } from '../src/services/spacedRevisionQueue.js';

const day = 86400000;
const wrong = { kind: 'outcome', correct: false };
const correct = { kind: 'outcome', correct: true, spaced: true };
const review = (state, action, now) =>
  transitionNotebookState(state, { kind: 'reviewSchedule', action }, now);

test('due only advances at the elapsed boundary and repeated correct revisions keep the original anchor', () => {
  const legacy = transitionNotebookState(null, wrong, 10);
  assert.deepEqual(getRevisionSchedule(legacy), { level: 0, dueAt: 10 });
  const first = transitionNotebookState(legacy, correct, 20);
  assert.equal(getRevisionSchedule(first).dueAt, 20 + day);
  assert.equal(transitionNotebookState(first, correct, 20 + day - 1), first);
  const second = transitionNotebookState(first, correct, 20 + day);
  assert.deepEqual(getRevisionSchedule(second), { level: 2, dueAt: 20 + 4 * day });
  const again = transitionNotebookState(second, { ...wrong, spaced: true }, 20 + 4 * day);
  assert.equal(getRevisionSchedule(again).level, 0);
  assert.equal(getRevisionSchedule(transitionNotebookState(again, correct, 20 + 4 * day)).level, 1);
  assert.equal(transitionNotebookState(null, { ...wrong, spaced: true }, 20), null);
});

test('legacy corrected items wait one day and control actions keep old note, bookmark and outcome fields', () => {
  const initial = transitionNotebookState(null, { kind: 'note', value: 'Keep' }, 1);
  const marked = transitionNotebookState(initial, { kind: 'bookmark', value: true }, 2);
  const legacy = transitionNotebookState(
    transitionNotebookState(marked, wrong, 3),
    { kind: 'outcome', correct: true },
    4
  );
  assert.equal(getRevisionSchedule(legacy).dueAt, 4 + day);
  assert.equal(transitionNotebookState(legacy, correct, 7), legacy);
  const paused = review(legacy, 'pause', 7);
  assert.equal(getRevisionSchedule(paused).dueAt, null);
  assert.equal(transitionNotebookState(paused, { ...wrong, spaced: true }, 8), paused);
  assert.equal(getRevisionSchedule(transitionNotebookState(paused, wrong, 9)).dueAt, null);
  const restored = review(paused, 'reset', 11);
  const { reviewSchedule, ...rest } = restored;
  assert.deepEqual(rest, legacy);
  assert.deepEqual(reviewSchedule, { level: 0, anchor: 11 });
});

test('the queue sorts due and upcoming current questions and excludes removed or replaced sources', () => {
  const entries = ['due', 'future', 'paused', 'changed'].map((entryKey, index) => ({
    ...transitionNotebookState(null, wrong, 10),
    entryKey,
    ref: { contentVersion: index + 1 },
    reviewSchedule: { level: [0, 1, -1, 0][index], anchor: 10 },
  }));
  const queue = classifyRevisions(
    entries,
    { due: { state: 'current' }, future: { state: 'current' }, changed: { state: 'replaced' } },
    10
  );
  for (const [category, key] of Object.entries({
    due: 'due',
    upcoming: 'future',
    paused: 'paused',
    excluded: 'changed',
  }))
    assert.deepEqual(
      queue[category].map(({ entry }) => entry.entryKey),
      [key]
    );
});

test('a changed Notebook revision never publishes a mixed queue', async () => {
  const service = {
    state: (() => {
      let rev = 0;
      return async () => ({ revision: rev++ });
    })(),
    async listPage() {
      return { entries: [], next: null };
    },
  };
  await assert.rejects(
    () =>
      loadSpacedRevision(
        service,
        async () => null,
        'alice',
        null,
        () => true
      ),
    /CONFLICT/
  );
});
