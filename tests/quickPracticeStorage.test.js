import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createQuickPracticeStorage,
  quickPracticeSlot,
} from '../src/services/quickPracticeStorage.js';
import {
  initialStudySession,
  questionFingerprint,
  sessionKey,
  clearStudySessions,
} from '../src/utils/studySession.js';

const uuid = '82000000-0000-4000-8000-000000000001';
function storage() {
  const values = {};
  Object.defineProperties(values, {
    getItem: { value: (key) => values[key] ?? null },
    setItem: {
      value: (key, value) => {
        values[key] = value;
      },
    },
    removeItem: {
      value: (key) => {
        delete values[key];
      },
    },
  });
  return values;
}
const q = { id: 'q1', question: 'Pick A', options: { A: 'Yes', B: 'No' }, answer: ['A'] };
const questions = Array.from({ length: 25 }, (_, index) => ({ ...q, id: String(index) }));
const options = { uid: 'alice', sourceId: 'gcp-ace', questions, size: 10 };

test('all formats resume exact membership/order and keep full-bank answers/checkpoints independent', () => {
  for (const format of [
    'single',
    'multiple',
    'yes-no',
    'dropdown-rows',
    'dropdown-inline',
    'drag-drop-rows',
    'drag-drop-inline',
  ]) {
    const base = JSON.parse(
      fs.readFileSync(new URL(`../public/examples/quiz-${format}.json`, import.meta.url))
    )[0];
    const rows = Array.from({ length: 25 }, (_, i) => ({ ...base, id: String(i) })),
      tab = storage();
    const service = createQuickPracticeStorage({
      storage: () => tab,
      random: () => 0.2,
      idFactory: () => uuid,
      now: () => 1000,
    });
    const result = service.resolve({ ...options, questions: rows });
    const another = createQuickPracticeStorage({
      storage: () => tab,
      random: () => {
        throw new Error('Do not resample');
      },
    });
    const restored = another.resolve({ ...options, questions: rows });
    assert.deepEqual(restored.indices, result.indices);
    assert.equal(restored.persisted, true);
    assert.equal(restored.manifest.runId, uuid);
    const fullKey = sessionKey('alice', 'gcp-ace', 'practice'),
      full = { answers: ['kept'], index: 2 };
    tab.setItem(fullKey, JSON.stringify(full));
    const create = () => ({
      signature: questionFingerprint(result.questions),
      answers: result.questions.map(() => null),
      index: 0,
    });
    const draft = initialStudySession(tab, result.draftKey, result.questions, 'practice', create, {
      fresh: result.fresh,
    });
    tab.setItem(result.draftKey, JSON.stringify({ ...draft, index: 2 }));
    assert.equal(
      initialStudySession(tab, restored.draftKey, restored.questions, 'practice', create, {
        fresh: restored.fresh,
      }).index,
      2
    );
    assert.deepEqual(JSON.parse(tab.getItem(fullKey)), full);
    assert.equal(Object.keys(tab).length, 3);
  }
});

test('fresh/older links, aliases, source versions, owners and notebook identities cannot substitute another run', () => {
  const tab = storage(),
    service = createQuickPracticeStorage({
      storage: () => tab,
      random: () => 0.25,
      idFactory: () => uuid,
      now: () => 1000,
    });
  const a = service.resolve({ ...options, sourceId: 'aws-ace', fresh: '1000' });
  assert.equal(service.resolve(options).manifest.runId, a.manifest.runId);
  service.resolve({ ...options, fresh: '2000' });
  assert.equal(service.resolve({ ...options, fresh: '1000' }).manifest.freshToken, '2000');
  assert.notEqual(
    quickPracticeSlot('alice', 'gcp-ace', 10),
    quickPracticeSlot('bob', 'gcp-ace', 10)
  );
  assert.notEqual(
    quickPracticeSlot('alice', `cloud:slot-1:${uuid}:v1`, 10),
    quickPracticeSlot('alice', `cloud:slot-1:${uuid}:v2`, 10)
  );
  assert.throws(
    () =>
      service.resolve({
        ...options,
        questions: questions.map((q) => ({ ...q, question: 'Changed' })),
      }),
    { code: 'SESSION_SOURCE_CHANGED' }
  );
  assert.equal(
    service.resolve({
      ...options,
      questions: questions.map((q) => ({ ...q, question: 'Changed' })),
      fresh: '3000',
    }).restored,
    false
  );
  const duplicateIds = questions.map(() => q),
    identities = questions.map((_, i) => `entry-${i}`);
  const pool = service.resolve({
    ...options,
    sourceId: 'notebook:pool',
    questions: duplicateIds,
    identities,
  });
  assert.equal(new Set(pool.manifest.keys).size, 10);
  clearStudySessions(tab, 'alice');
  assert.equal(Object.keys(tab).length, 0);
});

test('corrupt and unavailable storage are truthful; current in-memory study stays stable without a persistence claim', () => {
  const tab = storage(),
    slot = quickPracticeSlot('alice', 'gcp-ace', 10);
  tab.setItem(slot + ':manifest', '{corrupt');
  const service = createQuickPracticeStorage({ storage: () => tab });
  assert.throws(() => service.resolve(options), { code: 'SESSION_INVALID_SUBSET' });
  assert.equal(service.resolve({ ...options, fresh: '1000' }).persisted, true);
  for (const unavailable of [
    () => {
      throw new Error('Denied');
    },
    () => ({
      getItem: () => null,
      setItem: () => {
        throw new Error('Full');
      },
    }),
  ]) {
    let draws = 0;
    const memory = createQuickPracticeStorage({
      storage: unavailable,
      random: () => {
        draws++;
        return 0.2;
      },
      idFactory: () => uuid,
      now: () => 1000,
    });
    const a = memory.resolve(options),
      before = draws,
      b = memory.resolve(options);
    assert.equal(a.persisted, false);
    assert.equal(b.persisted, false);
    assert.equal(draws, before);
    assert.deepEqual(b.indices, a.indices);
  }
});

test('failed replacement keeps its in-memory run over the older disk manifest; old start links cannot resample changed sources', () => {
  const tab = storage();
  let full = false,
    draws = 0;
  const service = createQuickPracticeStorage({
    storage: () => ({
      getItem: (key) => tab.getItem(key),
      setItem: (key, value) => {
        if (full) throw new Error('Full');
        tab.setItem(key, value);
      },
    }),
    random: () => {
      draws++;
      return 0.4;
    },
    idFactory: () => uuid,
  });
  service.resolve({ ...options, fresh: '1000' });
  full = true;
  const current = service.resolve({ ...options, fresh: '2000' }),
    before = draws;
  assert.equal(current.persisted, false);
  assert.deepEqual(service.resolve({ ...options, fresh: '2000' }).manifest, current.manifest);
  assert.equal(draws, before);
  const changed = options.questions.map((question, index) =>
    index === 0 ? { ...question, question: 'Changed source' } : question
  );
  assert.throws(() => service.resolve({ ...options, questions: changed, fresh: '1000' }));
  assert.throws(() => service.resolve({ ...options, questions: changed, fresh: '2000' }));
  assert.equal(service.resolve({ ...options, questions: changed, fresh: '3000' }).restored, false);
});

test('a corrupted manifest cannot treat the saved start URL as permission to replace its answer draft', () => {
  const tab = storage(),
    slot = quickPracticeSlot('alice', 'gcp-ace', 10);
  tab.setItem(slot + ':manifest', '{broken');
  tab.setItem(slot + ':practice', JSON.stringify({ freshToken: '2000' }));
  const service = createQuickPracticeStorage({ storage: () => tab });
  for (const fresh of [null, '1000', '2000'])
    assert.throws(() => service.resolve({ ...options, fresh }), { code: 'SESSION_INVALID_SUBSET' });
  assert.equal(service.resolve({ ...options, fresh: '3000' }).restored, false);
});
