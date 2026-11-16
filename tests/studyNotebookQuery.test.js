import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  notebookFilters,
  notebookFilterShapes,
  notebookQueryPlan,
  notebookIndexFields,
} from '../src/utils/studyNotebookQuery.js';

const json = (name) =>
  JSON.parse(fs.readFileSync(new URL(`../firebase/${name}`, import.meta.url), 'utf8'));

test('every legal source/mistake/bookmark/review combination has a covering maintained index without erasing previous exemptions', () => {
  const candidate = json('firestore.notebook.indexes.json');
  const shapes = notebookFilterShapes();
  assert.equal(shapes.length, 16);
  const required = new Set();
  for (const filter of shapes) {
    assert.deepEqual(notebookFilters(filter), filter);
    const plan = notebookQueryPlan(filter);
    assert.equal(plan.limit, 20);
    assert.deepEqual(plan.order, [
      ['updatedAt', 'desc'],
      ['__name__', 'desc'],
    ]);
    const fields = notebookIndexFields(filter);
    if (fields) {
      required.add(JSON.stringify(fields));
      assert.ok(
        candidate.indexes.some(
          (index) =>
            index.collectionGroup === 'notebookEntries' &&
            index.queryScope === 'COLLECTION' &&
            JSON.stringify(index.fields) === JSON.stringify(fields)
        ),
        JSON.stringify(filter)
      );
    } else assert.deepEqual(plan.equalities, []);
  }
  assert.equal(candidate.indexes.length, required.size);
  assert.equal(required.size, 11);
  for (const baseline of ['firestore.indexes.json', 'firestore.history.indexes.json']) {
    for (const exemption of json(baseline).fieldOverrides)
      assert.ok(
        candidate.fieldOverrides.some(
          (value) => JSON.stringify(value) === JSON.stringify(exemption)
        )
      );
    for (const index of json(baseline).indexes)
      assert.ok(candidate.indexes.some((value) => JSON.stringify(value) === JSON.stringify(index)));
  }
  assert.ok(
    candidate.fieldOverrides.some(
      (value) =>
        value.collectionGroup === 'notebookEntries' &&
        value.fieldPath === 'note' &&
        value.indexes.length === 0
    )
  );
});

test('review filters require mistakes; query bounds/cursors are strict and retain submillisecond ordering', () => {
  for (const filters of [
    null,
    [],
    { unknown: true },
    { review: 'reviewed' },
    { mistakes: 'true' },
    { bookmarks: 1 },
    { sourceGroup: 'gcp-ace' },
    { sourceGroup: 'bank:../../other' },
    { mistakes: true, review: 'unknown' },
  ])
    assert.throws(() => notebookQueryPlan(filters), { code: 'NOTEBOOK_INVALID' });
  const cursor = { seconds: 1000, nanoseconds: 123456789, entryKey: 'a'.repeat(64) };
  assert.deepEqual(notebookQueryPlan({}, cursor).after, cursor);
  for (const patch of [
    { seconds: -1 },
    { nanoseconds: 1e9 },
    { nanoseconds: 0.5 },
    { seconds: 253402300800 },
    { entryKey: 'bad' },
    { extra: true },
  ])
    assert.throws(() => notebookQueryPlan({}, { ...cursor, ...patch }), {
      code: 'NOTEBOOK_INVALID',
    });
  assert.deepEqual(
    notebookQueryPlan({
      sourceGroup: 'bank:gcp-ace',
      mistakes: true,
      bookmarks: true,
      review: 'pending',
    }).equalities,
    [
      ['sourceGroup', 'bank:gcp-ace'],
      ['mistake', true],
      ['bookmarked', true],
      ['reviewed', false],
    ]
  );
});
