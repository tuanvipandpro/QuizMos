import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { findQuiz, FEATURED_QUIZ_IDS, PROVIDERS } from '../src/data/quizzes.js';
import { validateQuizQuestions } from '../src/utils/questionModel.js';
const meta = findQuiz('gh-600');
const bank = JSON.parse(fs.readFileSync('public/' + meta.file, 'utf8'));
test('GH-600 registers all supplied formats without changing source IDs/answer mappings', () => {
  assert.equal(meta.totalQuestions, 98);
  assert.equal(meta.category, 'Microsoft');
  assert.equal(meta.code, 'GH-600');
  assert.equal(meta.difficulty, 'Intermediate');
  assert.deepEqual(FEATURED_QUIZ_IDS, ['aws-aip-c01', 'anthropic-ccar-p']);
  assert.equal(PROVIDERS.length, 5);
  validateQuizQuestions(bank);
  assert.deepEqual(
    bank.map((q) => q.id),
    Array.from({ length: 98 }, (_, i) => `q-${i + 1}`)
  );
  const counts = bank.reduce((all, q) => ({ ...all, [q.type]: (all[q.type] || 0) + 1 }), {});
  assert.deepEqual(counts, { multiple_choice: 61, yes_no: 10, dropdown: 8, drag_drop: 19 });
  const review = JSON.parse(fs.readFileSync('docs/gh-600-review.json', 'utf8'));
  const projection = bank.map(({ id, answer }) => ({ id, answer }));
  assert.equal(
    createHash('sha256').update(JSON.stringify(projection)).digest('hex'),
    review.sourceIdAnswerSha256
  );
  assert.equal(
    createHash('sha256')
      .update(JSON.stringify(bank.map(({ id, options }) => ({ id, options }))))
      .digest('hex'),
    review.reviewedOptionsSha256
  );
  assert.equal(
    createHash('sha256')
      .update(fs.readFileSync('public/' + meta.file, 'utf8').replace(/\r\n/g, '\n'))
      .digest('hex'),
    review.publishedSha256
  );
  assert.equal(review.corrections.length, 32);
});
test('q-51 preserves native slots and literal Actions syntax with one executor per job', () => {
  const q = bank.find((q) => q.id === 'q-51');
  assert.equal(q.type, 'drag_drop');
  assert.equal(q.sourceType, 'drag_drop');
  assert.equal(q.template.match(/^ {2}risk_reviewer:/gm)?.length, 1);
  assert.equal(q.template.match(/^ {2}spec_analyzer:/gm)?.length, 1);
  assert.match(q.template, /run: \.\/executors\/risk_reviewer\.sh/);
  assert.ok(q.template.includes('${{ github.ref }}'));
  assert.deepEqual(q.answer, { s1: 'E', s2: 'A', s3: 'B' });
});
