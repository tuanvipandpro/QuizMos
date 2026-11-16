import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  defaultExamSetup,
  eligibleStudyPool,
  examSetupFromParams,
  practiceSize,
  resolveExamSettings,
  sampleStudyPool,
  studyInteger,
} from '../src/utils/studySettings.js';
import { getCertificationProfile } from '../src/data/certificationProfiles.js';

const q = { id: 'q1', question: 'Choose A', options: { A: 'Yes', B: 'No' }, answer: ['A'] };
const pool = (count) => Array.from({ length: count }, (_, i) => ({ ...q, id: `q${i}` }));
const plan = (patch = {}) =>
  resolveExamSettings({
    quizId: 'aws-aip-c01',
    questions: pool(100),
    kind: 'cert',
    count: 75,
    minutes: 180,
    feedbackMode: 'standard',
    day: '2026-11-15',
    ...patch,
  });

test('retired questions stay in practice but not certification or custom exam pools', () => {
  const questions = pool(100).map((item, i) => (i < 30 ? { ...item, retired: true } : item));
  assert.equal(eligibleStudyPool(questions).items.length, 100);
  assert.equal(defaultExamSetup('custom', questions).count, 50);
  const custom = plan({ quizId: 'custom', kind: 'custom', questions, count: 70, minutes: 60 });
  assert.equal(custom.selectionQuestions.length, 70);
  assert.ok(custom.selectionQuestions.every((item) => item.retired !== true));
  assert.equal(custom.excluded.filter((item) => item.reason === 'retired').length, 30);
  assert.throws(() => plan({ questions, count: 75 }), { code: 'SESSION_INSUFFICIENT' });
  assert.equal(
    defaultExamSetup(
      'custom',
      questions.map((item) => ({ ...item, retired: true }))
    ).count,
    null
  );
});

test('exact and range defaults follow the profile; partial profiles remain explicit training', () => {
  assert.deepEqual(defaultExamSetup('aws-aip-c01', pool(100)), {
    kind: 'cert',
    count: 75,
    minutes: 180,
    feedbackMode: 'standard',
  });
  assert.equal(defaultExamSetup('aws-ace', pool(100)).count, 50);
  assert.equal(defaultExamSetup('gcp-pcde', pool(100)).count, 40);
  assert.equal(defaultExamSetup('az-900', pool(100)).kind, 'custom');
  assert.equal(defaultExamSetup('az-900', pool(100)).minutes, 45);
  assert.equal(defaultExamSetup('ab-100', pool(100)).minutes, 60);
  assert.equal(defaultExamSetup('ab-731', pool(100)).kind, 'custom');
  assert.equal(defaultExamSetup('ab-731', pool(100)).minutes, 45);
  assert.equal(defaultExamSetup('custom', []).count, null);
  assert.equal(defaultExamSetup('aws-dva', pool(100), '2026-12-01').kind, 'custom');
  const result = plan();
  assert.equal(result.settings.profile.code, 'AIP-C01');
  assert.deepEqual(result.settings.profile, getCertificationProfile('aws-aip-c01'));
  assert.notEqual(result.settings.profile, getCertificationProfile('aws-aip-c01'));
  assert.equal(plan({ feedbackMode: 'learning' }).settings.kind, 'custom');
});

test('count/time/form and URL boundaries reject invalid new settings rather than clamp them', () => {
  for (const value of [
    null,
    undefined,
    '',
    ' ',
    '1e2',
    '+10',
    '-1',
    '2.5',
    0,
    -1,
    0.5,
    NaN,
    Infinity,
    {},
    [],
  ])
    assert.throws(() => studyInteger(value, 'count'), { code: 'SESSION_INVALID', field: 'count' });
  assert.equal(studyInteger('10', 'count'), 10);
  for (const patch of [
    { count: 74 },
    { count: 101 },
    { minutes: 120 },
    { kind: 'unknown' },
    { quizId: 'ab-100' },
    { quizId: 'istqb-ct-ai' },
  ])
    assert.throws(() => plan(patch));
  assert.equal(plan({ kind: 'custom', count: 1, minutes: 1 }).settings.minutes, 1);
  assert.equal(plan({ kind: 'custom', count: 100, minutes: 180 }).settings.count, 100);
  assert.throws(() => plan({ kind: 'custom', minutes: 181 }), {
    code: 'SESSION_INVALID',
    field: 'minutes',
  });
  const legacy = examSetupFromParams(
    new URLSearchParams('count=50&time=60&feedback=learning'),
    'aws-aip-c01',
    pool(100)
  );
  assert.deepEqual(legacy, {
    kind: 'custom',
    count: '50',
    minutes: '60',
    feedbackMode: 'learning',
  });
  assert.equal(examSetupFromParams(new URLSearchParams(), 'aws-aip-c01', pool(100)).count, 75);
  assert.equal(
    examSetupFromParams(new URLSearchParams('count=bad'), 'aws-aip-c01', pool(100)).count,
    'bad'
  );
  assert.equal(practiceSize('20'), 20);
  assert.equal(practiceSize(null), 'all');
  assert.throws(() => practiceSize('11'), { code: 'SESSION_INVALID' });
});

test('insufficient/empty and format-ineligible pools never repeat or silently shorten a paper', () => {
  assert.throws(
    () => plan({ quizId: 'istqb-ctal-ta-v4-0', count: 45, minutes: 120, questions: pool(42) }),
    { code: 'SESSION_INSUFFICIENT' }
  );
  assert.equal(
    plan({ quizId: 'gcp-gal', count: 50, minutes: 90, questions: pool(56) }).selectionQuestions
      .length,
    56
  );
  assert.throws(() => plan({ quizId: 'gcp-gal', count: 60, minutes: 90, questions: pool(56) }), {
    code: 'SESSION_INSUFFICIENT',
  });
  assert.throws(() => plan({ kind: 'custom', count: 1, questions: [] }), {
    code: 'SESSION_INSUFFICIENT',
  });
  const invalid = { ...q, id: 'ungradable', answer: [] };
  assert.equal(eligibleStudyPool([q, invalid]).excluded[0].reason, 'ungradable');
  const structured = JSON.parse(
    fs.readFileSync(new URL('../public/examples/quiz-yes-no.json', import.meta.url))
  )[0];
  assert.equal(
    eligibleStudyPool([q, structured], { formats: ['multiple_choice'] }).excluded[0].reason,
    'format'
  );
});

test('seeded sampling preserves originals without replacement across every format and disambiguated sources', () => {
  for (const format of [
    'single',
    'multiple',
    'yes-no',
    'dropdown-rows',
    'dropdown-inline',
    'drag-drop-rows',
    'drag-drop-inline',
  ]) {
    const original = JSON.parse(
      fs.readFileSync(new URL(`../public/examples/quiz-${format}.json`, import.meta.url))
    )[0];
    const questions = Array.from({ length: 25 }, (_, i) => ({ ...original, id: `${i}` })),
      before = structuredClone(questions);
    const items = eligibleStudyPool(questions).items;
    const a = sampleStudyPool(items, 20, () => 0.25),
      b = sampleStudyPool(items, 20, () => 0.25);
    assert.deepEqual(
      a.map((item) => item.key),
      b.map((item) => item.key)
    );
    assert.equal(new Set(a.map((item) => item.key)).size, 20);
    assert.deepEqual(questions, before);
    assert.equal(a[0].question, questions[a[0].index]);
  }
  assert.throws(() => eligibleStudyPool([q, q]), { code: 'SESSION_INVALID_POOL' });
  assert.equal(
    eligibleStudyPool([q, q], { identities: ['bank-a:q1', 'bank-b:q1'] }).items.length,
    2
  );
  assert.throws(() => sampleStudyPool(eligibleStudyPool(pool(3)).items, 4), {
    code: 'SESSION_INSUFFICIENT',
  });
  assert.throws(() => sampleStudyPool(eligibleStudyPool(pool(3)).items, 2, () => NaN), {
    code: 'SESSION_INVALID_RANDOM',
  });
});
