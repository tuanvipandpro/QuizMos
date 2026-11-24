import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchingPlan,
  normalizeOutcome,
  outcomeRecordEdit,
  outcomeReportEdit,
  publicOutcome,
  readPublicOutcome,
} from '../src/utils/certificationOutcomes.js';

const form = {
  bankId: 'aws-ace',
  examDate: '2026-11-21',
  result: 'passed',
  score: '87.5',
  scoreMax: '100',
  note: 'Private',
};
const day = '2026-11-24';
const id = 'ee32e16c-94fe-4a0c-b606-5392713da865';

test('validate reported scores and date without inferring a result from grades', () => {
  const { value } = normalizeOutcome(form, day);
  assert.equal(value.bankId, 'gcp-ace');
  assert.equal(value.score, 87.5);
  assert.equal(value.result, 'passed');
  assert.equal(normalizeOutcome({ ...form, examDate: '2026-11-25' }, day).field, 'examDate');
  assert.equal(normalizeOutcome({ ...form, examDate: '2026-02-31' }, day).field, 'examDate');
  assert.equal(normalizeOutcome({ ...form, scoreMax: '' }, day).field, 'score');
  assert.equal(normalizeOutcome({ ...form, score: '101' }, day).field, 'score');
  assert.equal(normalizeOutcome({ ...form, result: '', score: '100' }, day).field, 'result');
});

test('a compatible plan alias can resolve a link but replacement cannot', () => {
  const record = { bankId: 'gcp-ace', planSlot: 'slot-1', planId: id };
  const plan = { bankId: 'aws-ace', slot: 'slot-1', instanceId: id };
  assert.equal(matchingPlan(plan, record), true);
  assert.equal(matchingPlan({ ...plan, instanceId: 'replacement' }, record), false);
});

test('record retries are idempotent and a stale revision cannot replace a newer record', () => {
  const command = {
    slot: 'slot-1',
    instanceId: id,
    revision: 0,
    fields: { ...normalizeOutcome(form, day).value, planId: null, planSlot: null },
  };
  const record = outcomeRecordEdit(null, command);
  assert.equal(outcomeRecordEdit(record, command), null);
  assert.throws(
    () => outcomeRecordEdit(record, { ...command, fields: { ...command.fields, note: 'Changed' } }),
    /conflict/
  );
});

test('sharing projects only the public fields and cannot bypass pending review', () => {
  const pending = outcomeReportEdit(null, {
    uid: 'alice',
    slot: 'slot-1',
    action: 'submit',
    revision: 0,
    bankId: 'gcp-ace',
    result: 'passed',
    experience: ' Reviewed the guide ',
  });
  assert.throws(() => outcomeReportEdit(null, { action: 'publish', revision: 0 }), /conflict/);
  const report = outcomeReportEdit(pending, { action: 'publish', revision: 1 });
  assert.equal(outcomeReportEdit(report, { action: 'publish', revision: 1 }), null);
  assert.deepEqual(publicOutcome({ ...report, note: 'Private', score: 99 }), {
    bankId: 'gcp-ace',
    result: 'passed',
    experience: 'Reviewed the guide',
  });
  assert.throws(
    () => readPublicOutcome({ ...publicOutcome(report), owner: 'alice', publishedAt: 1 }),
    /invalid/
  );
  assert.equal(outcomeReportEdit(report, { action: 'remove', revision: 2 }).experience, '');
});
