import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateQuizQuestions,
  emptyAnswer,
  isAnswerComplete,
  isAnswerCorrect,
  formatAnswerLines,
  formatQuestionText,
  shuffleQuestionOptions,
} from '../src/utils/questionModel.js';
import {
  dragDropChoices,
  placeDragChoice,
  clearDragSlot,
  normalizeDragAnswer,
} from '../src/utils/dragDropModel.js';
import { dragDropTemplateParts } from '../src/utils/dragDropTemplate.js';

const question = {
  id: 'native',
  type: 'drag_drop',
  layout: 'rows',
  question: 'Place the choices.',
  slots: [
    { id: 'first', label: 'First slot' },
    { id: 'second', label: 'Second slot' },
  ],
  options: {
    first: { A: 'First choice', B: 'Second choice' },
    second: { A: 'First choice', B: 'Second choice' },
  },
  answer: { first: 'A', second: 'A' },
};
test('native type stays distinct, grades every mapping and retains reusable choice keys', () => {
  assert.equal(validateQuizQuestions([question])[0].type, 'drag_drop');
  assert.deepEqual(emptyAnswer(question), {});
  assert.equal(isAnswerComplete(question, { first: 'A' }), false);
  assert.equal(isAnswerCorrect(question, question.answer), true);
  assert.equal(isAnswerCorrect(question, { first: 'A', second: 'B' }), false);
  assert.equal(isAnswerComplete(question, { ...question.answer, extra: 'A' }), false);
  assert.deepEqual(formatAnswerLines(question, question.answer, { showKeys: true }), [
    'First slot: A. First choice',
    'Second slot: A. First choice',
  ]);
  assert.match(formatQuestionText(question), /First slot\nA\. First choice/);
  assert.equal(shuffleQuestionOptions(question, () => 0).type, 'drag_drop');
  assert.deepEqual(shuffleQuestionOptions(question, () => 0).answer, question.answer);
});
test('native schema rejects arrays, missing/extra keys, bad layouts and templates', () => {
  for (const patch of [
    { answer: ['A'] },
    { answer: { first: 'Z', second: 'A' } },
    { options: { ...question.options, extra: { A: 'A', B: 'B' } } },
    { slots: [question.slots[0], question.slots[0]] },
    { layout: 'unknown' },
  ])
    assert.throws(() => validateQuizQuestions([{ ...question, ...patch }]));
  const inline = { ...question, layout: 'inline', template: '{{first}} then {{second}}' };
  assert.doesNotThrow(() => validateQuizQuestions([inline]));
  for (const template of ['', '{{first}} {{first}}', '{{first}} {{unknown}}'])
    assert.throws(() => validateQuizQuestions([{ ...inline, template }]));
});

test('native inline placeholders preserve literal GitHub code expressions', () => {
  const template =
    'if: {{first}}\ngroup: run-${{ github.ref }}\nstep: {{second}}\necho: ${{ needs.plan.outputs.risk }}';
  const native = { ...question, layout: 'inline', template };
  assert.doesNotThrow(() => validateQuizQuestions([native]));
  const parts = dragDropTemplateParts(template);
  assert.deepEqual(
    parts.filter((x) => x.slotId).map((x) => x.slotId),
    ['first', 'second']
  );
  assert(
    parts
      .filter((x) => x.text)
      .map((x) => x.text)
      .join('')
      .includes('run-${{ github.ref }}')
  );
  assert.throws(() => validateQuizQuestions([{ ...native, template: template + ' {{unknown}}' }]));
});
test('native placement copies/reuses, moves and replaces without mutating unrelated answers', () => {
  const [a, b] = dragDropChoices(question);
  const original = { first: 'A', second: 'B' };
  assert.deepEqual(placeDragChoice(question, original, { choice: a, fromSlot: null }, 'second'), {
    first: 'A',
    second: 'A',
  });
  assert.deepEqual(
    placeDragChoice(question, original, { choice: a, fromSlot: 'first' }, 'second'),
    { second: 'A' }
  );
  assert.deepEqual(
    placeDragChoice(question, original, { choice: b, fromSlot: 'second' }, 'first'),
    { first: 'B' }
  );
  assert.deepEqual(original, { first: 'A', second: 'B' });
  assert.deepEqual(clearDragSlot(question, original, 'first'), { second: 'B' });
  assert.equal(
    placeDragChoice(question, original, { choice: b, fromSlot: 'first' }, 'second'),
    null
  );
  assert.equal(placeDragChoice(question, original, { choice: a }, 'missing'), null);
});
test('bank deduplication keeps key/text identity and cannot place a foreign slot option', () => {
  assert.equal(dragDropChoices(question).length, 2);
  const distinct = {
    ...question,
    options: { ...question.options, second: { A: 'Different first', B: 'Second choice' } },
  };
  const choices = dragDropChoices(distinct);
  assert.equal(choices.length, 3);
  assert.equal(placeDragChoice(distinct, {}, { choice: choices[0] }, 'second'), null);
  assert.deepEqual(normalizeDragAnswer(question, { first: 'A', second: 'unknown', extra: 'B' }), {
    first: 'A',
  });
});
