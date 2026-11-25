import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchingPlan,
  normalizeOutcome,
  outcomeRecordEdit,
  withdrawOutcomeReport,
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

test('legacy withdrawal clears shared text and tolerates an exact retry', () => {
  const report = {
    owner: 'alice',
    slot: 'slot-1',
    status: 'published',
    revision: 2,
    bankId: 'gcp-ace',
    result: 'passed',
    experience: 'Reviewed the guide',
  };
  const removed = withdrawOutcomeReport(report, 2);
  assert.deepEqual(removed, { ...report, status: 'removed', revision: 3, experience: '' });
  assert.equal(withdrawOutcomeReport(removed, 2), null);
  assert.throws(() => withdrawOutcomeReport(report, 1), /conflict/);
});
