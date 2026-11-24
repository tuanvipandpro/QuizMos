import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addRoadmapDays,
  isRoadmapDay,
  readRoadmapPlan,
  roadmapDayInZone,
  roadmapFields,
  roadmapOutsideTasks,
  roadmapWeekTasks,
} from '../src/utils/studyRoadmap.js';
import { roadmapCommand, roadmapWrite } from '../src/services/studyRoadmapCommand.js';

const now = Date.parse('2026-03-07T23:30:00Z');
const fields = {
  bankId: 'gcp-ace',
  startDate: '2026-03-09',
  targetDate: '2026-03-25',
  timezone: 'America/New_York',
  weeklyGoal: 3,
  archived: false,
  overrides: {},
};
const id = '7d252eb6-571d-4a0b-9214-2106b5d29dee';
const another = '8d252eb6-571d-4a0b-9214-2106b5d29dee';

test('editing an aliased bank keeps the stored bank key for immutable plan Rules', () => {
  const stored = roadmapCommand('slot-1', id, 0, { ...fields, bankId: 'aws-ace' });
  const plan = readRoadmapPlan(stored.slot, stored.data);
  const updated = roadmapFields({ ...plan, bankId: 'gcp-ace', weeklyGoal: 4 }, plan, now);
  assert.equal(updated.value.bankId, 'aws-ace');
  assert.equal(updated.value.weeklyGoal, 4);
});

test('uses a civil day in the selected zone and counts across DST and leap boundaries', () => {
  assert.equal(roadmapDayInZone(now, 'Asia/Ho_Chi_Minh'), '2026-03-08');
  assert.equal(roadmapDayInZone(now, 'America/New_York'), '2026-03-07');
  assert.equal(addRoadmapDays('2028-02-28', 1), '2028-02-29');
  assert.equal(isRoadmapDay('2026-02-29'), false);
  assert.equal(
    roadmapFields({ ...fields, targetDate: '2026-03-13' }, null, now).field,
    'targetDate'
  );
  assert.equal(
    roadmapFields({ ...fields, bankId: 'aws-ace', weeklyGoal: 0 }, null, now).value.bankId,
    'gcp-ace'
  );
  assert.equal(roadmapFields({ ...fields, timezone: 'invalid' }, null, now).field, 'timezone');
  assert.equal(roadmapFields({ ...fields, bankId: 'missing' }, null, now).field, 'bankId');
  assert.equal(
    roadmapFields(fields, fields, Date.parse('2026-04-01T00:00:00Z')).value.targetDate,
    fields.targetDate
  );
});

test('an edit keeps explicit tasks even when the goal drops or the target moves', () => {
  assert.deepEqual(
    roadmapWeekTasks(fields, '2026-03-09').map(({ date }) => date),
    ['2026-03-09', '2026-03-11', '2026-03-13']
  );
  assert.equal(roadmapWeekTasks(fields, '2026-03-23').length, 2);
  const overrides = {
    '2026-03-09:1': { date: '2026-03-17', done: true },
    '2026-03-16:2': { date: '2026-03-23', done: false },
  };
  const plan = { ...fields, overrides, weeklyGoal: 0, targetDate: '2026-03-20' };
  assert.deepEqual(roadmapWeekTasks(plan, '2026-03-09'), []);
  assert.deepEqual(
    roadmapWeekTasks(plan, '2026-03-16').map(({ id, done }) => [id, done]),
    [['2026-03-09:1', true]]
  );
  assert.equal(roadmapOutsideTasks(plan)[0].id, '2026-03-16:2');
});

test('matches submitted archives by canonical public bank and plan week once per attempt', () => {
  const record = {
    attemptId: id,
    source: { kind: 'bank', id: 'aws-ace' },
    questionCount: 10,
    unanswered: 2,
    endReason: 'submitted',
    endedAt: Date.parse('2026-03-11T03:00:00Z'),
  };
  const evidence = [
    record,
    record,
    { ...record, attemptId: 'private', source: { kind: 'custom', id: 'gcp-ace' } },
    { ...record, attemptId: 'expired', endReason: 'expired' },
    { ...record, attemptId: 'unanswered', unanswered: 10 },
  ];
  const tasks = roadmapWeekTasks({ ...fields, weeklyGoal: 6 }, '2026-03-09', evidence);
  assert.equal(tasks.filter((task) => task.attemptId).length, 1);
  assert.equal(tasks.find((task) => task.attemptId).done, false);
  assert.deepEqual(
    roadmapWeekTasks(fields, '2026-03-16', evidence).filter((task) => task.attemptId),
    []
  );
});

test('a command tolerates exact replay and rejects stale, moved or reused instances', () => {
  const first = roadmapCommand('slot-1', id, 0, fields);
  const edit = roadmapCommand('slot-1', id, 1, { ...fields, weeklyGoal: 5 });
  assert.equal(roadmapWrite(undefined, first), first.data);
  assert.equal(roadmapWrite(first.data, first), undefined);
  assert.equal(roadmapWrite(first.data, edit), edit.data);
  assert.equal(roadmapWrite(edit.data, edit), undefined);
  assert.throws(() => roadmapWrite(edit.data, first), /conflict/);
  assert.throws(() => roadmapWrite(undefined, edit), /conflict/);
  assert.throws(
    () => roadmapWrite(edit.data, { slot: 'slot-1', instanceId: another, revision: 2, data: null }),
    /conflict/
  );
  assert.equal(roadmapWrite(undefined, { instanceId: id, revision: 2, data: null }), null);
  assert.throws(
    () =>
      readRoadmapPlan('slot-1', {
        ...first.data,
        overrides: '{"2026-03-10:0":{"date":"2026-03-12","done":true}}',
      }),
    /invalid/
  );
});
