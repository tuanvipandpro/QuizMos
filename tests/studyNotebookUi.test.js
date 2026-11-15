import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, canonicalQuizHash } from '../src/utils/navigation.js';
import { vi, translate } from '../src/i18n/messages.js';
import { NOTEBOOK_MESSAGES, NOTEBOOK_SOURCE_LABELS } from '../src/data/studyNotebookMessages.js';

test('notebook routes accept a reference-set hash without changing canonical quiz/alias routing', () => {
  const id = 'a'.repeat(64);
  assert.equal(parseRoute('#/notebook').page, 'notebook');
  assert.equal(parseRoute('#/notebook').selectionId, null);
  assert.equal(parseRoute('#/notebook/study/' + id).selectionId, id);
  for (const path of [
    '#/notebook/study/bad',
    '#/notebook/unknown',
    '#/notebook/study/' + id + '/extra',
  ])
    assert.equal(parseRoute(path).page, 'library');
  assert.equal(canonicalQuizHash('#/notebook/study/' + id), '#/notebook/study/' + id);
  assert.equal(canonicalQuizHash('#/quiz/aws-ace/practice'), '#/quiz/gcp-ace/practice');
});

test('all notebook errors/source states have Vietnamese copy and selection counts use natural English singulars', () => {
  for (const label of [
    ...Object.values(NOTEBOOK_MESSAGES),
    ...Object.values(NOTEBOOK_SOURCE_LABELS),
  ])
    assert.equal(typeof vi[label], 'string', label);
  assert.equal(translate('en', '{count} questions selected', { count: 1 }), '1 question selected');
  assert.equal(translate('en', '{count} questions selected', { count: 2 }), '2 questions selected');
  assert.equal(translate('vi', '{count} questions selected', { count: 1 }), 'Đã chọn 1 câu hỏi');
});
