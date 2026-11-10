import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import {
  validateQuizQuestions,
  isAnswerComplete,
  isAnswerCorrect,
} from '../src/utils/questionModel.js';
const bank = JSON.parse(fs.readFileSync('public/quiz/Google/GCP_PAA.json', 'utf8'));
const review = JSON.parse(fs.readFileSync('docs/gcp-paa-review.json', 'utf8'));
const digest = (v) => createHash('sha256').update(v).digest('hex');
test('PAA preserves all supplied IDs/answer keys and freezes the reviewed content', () => {
  validateQuizQuestions(bank);
  assert.equal(bank.length, 75);
  assert.deepEqual(
    bank.map((q) => q.id),
    Array.from({ length: 75 }, (_, i) => `q-${i + 1}`)
  );
  assert.equal(
    digest(JSON.stringify(bank.map(({ id, answer }) => ({ id, answer })))),
    review.sourceIdAnswerSha256
  );
  assert.equal(
    digest(JSON.stringify(bank.map(({ id, options }) => ({ id, options })))),
    review.reviewedOptionsSha256
  );
  assert.equal(
    digest(fs.readFileSync('public/quiz/Google/GCP_PAA.json', 'utf8').replace(/\r\n/g, '\n')),
    review.publishedSha256
  );
  assert.equal(
    review.sourceSha256,
    '5d141af6f36ac5fdc1e2fc549f68c1aa5f18942e39a5da759c6afe618234bc9f'
  );
  assert.equal(review.reviewedQuestions.length, 75);
  assert.ok(review.reviewedQuestions.every((q) => q.sources.length > 0));
  assert.equal(bank.filter((q) => q.answer.length === 1).length, 68);
  assert.equal(bank.filter((q) => q.answer.length > 1).length, 7);
  for (const q of bank) {
    assert.ok(q.explanation.trim());
    const selection = q.answer.length === 1 ? q.answer[0] : q.answer;
    assert.equal(isAnswerComplete(q, selection), true);
    assert.equal(isAnswerCorrect(q, selection), true);
    if (q.answer.length > 1) {
      assert.equal(isAnswerComplete(q, q.answer.slice(0, 1)), false);
      assert.equal(isAnswerCorrect(q, q.answer.slice(0, 1)), false);
    }
  }
});
test('PAA corrected premises do not teach unsupported security or medical guarantees', () => {
  const q = (id) => bank.find((q) => q.id === id);
  assert.match(q('q-30').options.C, /USER_PREFERENCES/);
  assert.doesNotMatch(q('q-30').options.C, /USER-PREFERENCES/);
  assert.match(q('q-20').question, /non-medical/);
  assert.doesNotMatch(q('q-20').question, /radiology|diagnostic correlation/);
  assert.match(q('q-55').options.A, /SecurityPlugin/);
  assert.doesNotMatch(q('q-55').options.A, /VertexAiSessionService|SecureRunner/);
  assert.match(q('q-64').options.B, /Secret Manager secret/);
  assert.doesNotMatch(q('q-66').options.E, /air.gapped|latest Gemma/);
  assert.match(q('q-70').question, /live runner/);
  assert.match(q('q-71').options.A, /PreToolUse/);
  assert.match(q('q-72').options.C, /approved project/);
  assert.match(q('q-73').options.C, /Model Armor/);
  assert.equal(review.corrections.length, 36);
});
import { findQuiz, FEATURED_QUIZ_IDS, PROVIDERS } from '../src/data/quizzes.js';
import { quizUpdates } from '../src/data/quizUpdates.js';
import { translate } from '../src/i18n/messages.js';

test('PAA catalog and reviewed update use a canonical Google identity with localized discovery', () => {
  const meta = findQuiz('gcp-paa');
  assert.equal(meta.category, 'Google Cloud');
  assert.equal(meta.code, 'PAA');
  assert.equal(meta.name, 'Professional Agentic Architect (PAA)');
  assert.equal(meta.totalQuestions, 75);
  assert.deepEqual(meta.aliases, ['GCP-PAA', 'GCP_PAA']);
  assert.equal(meta.file, 'quiz/Google/GCP_PAA.json');
  assert.deepEqual(FEATURED_QUIZ_IDS, ['aws-aip-c01', 'anthropic-ccar-p']);
  assert.equal(PROVIDERS.length, 5);
  const update = quizUpdates.find((e) => e.bankId === meta.id);
  assert.equal(update.date, '2026-11-10');
  assert.equal(update.kind, 'added');
  assert.match(update.sourceRevision, /^[a-f0-9]{40}$/);
  assert.match(update.summary, /75.*PAA.*7 multiple-answer/);
  assert.notEqual(translate('vi', update.summary), update.summary);
});
