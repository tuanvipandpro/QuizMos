import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  projectQuizPdf,
  quizPdfDocument,
  quizPdfAccess,
  quizPdfFilename,
} from '../src/utils/quizPdf.js';
const formats = [
  'single',
  'multiple',
  'yes-no',
  'dropdown-rows',
  'dropdown-inline',
  'drag-drop-rows',
  'drag-drop-inline',
];
const questions = formats.map((f, i) => ({
  ...JSON.parse(fs.readFileSync('public/examples/quiz-' + f + '.json'))[0],
  id: 'stable-' + i,
  explanation: 'MUST_NOT_EXPORT_EXPLANATION',
}));
const quiz = { id: 'aws-aip-c01', kind: 'bank', name: 'Bộ câu hỏi tiếng Việt', questions };
test('whole projection preserves original seven-format identities and mapping, strips explanations, and produces separate aligned answer key', () => {
  const before = structuredClone(quiz),
    model = projectQuizPdf(quiz, null, quizPdfAccess(quiz, null));
  assert.deepEqual(quiz, before);
  assert.deepEqual(
    model.questions.map((q) => q.id),
    questions.map((q) => q.id)
  );
  assert.equal(JSON.stringify(model).includes('MUST_NOT_EXPORT'), false);
  const doc = quizPdfDocument(model);
  assert.ok(JSON.stringify(doc).includes('Bộ câu hỏi tiếng Việt'));
  assert.equal(doc.content.filter((x) => x.pageBreak === 'before').length, 1);
  for (const q of model.questions) assert.ok(q.answers.length);
  assert.ok(model.questions[6].template);
});
test('denied offline permission and cross-owner private sources fail before export; guest tab uploads remain local', () => {
  for (const access of [
    { read: true, offlineExport: false },
    { read: false, offlineExport: true },
    null,
  ])
    assert.throws(() => projectQuizPdf(quiz, null, access), { code: 'PDF_ACCESS' });
  const custom = {
    ...quiz,
    id: 'cloud:slot-1:60000000-0000-4000-8000-000000000001',
    kind: 'cloud-custom',
    owner: 'alice',
  };
  assert.throws(() => projectQuizPdf(custom, 'bob', { read: true, offlineExport: true }), {
    code: 'PDF_ACCESS',
  });
  assert.equal(projectQuizPdf(custom, 'alice', quizPdfAccess(custom, 'alice')).questions.length, 7);
  assert.equal(
    projectQuizPdf({ ...quiz, kind: 'tab-upload', owner: null }, null, {
      read: true,
      offlineExport: true,
    }).questions.length,
    7
  );
});
test('legacy unknown keys are explicit, bounded jobs do not truncate, and filenames cannot escape a download basename', () => {
  const legacy = { ...quiz, questions: [{ ...questions[0], answer: ['missing'] }] };
  const p = projectQuizPdf(legacy, null, { read: true, offlineExport: true });
  assert.equal(p.questions[0].answers, null);
  assert.ok(JSON.stringify(quizPdfDocument(p)).includes('Answer unavailable'));
  assert.throws(
    () =>
      projectQuizPdf(
        { ...quiz, questions: Array.from({ length: 1001 }, (_, id) => ({ ...questions[0], id })) },
        null,
        { read: true, offlineExport: true }
      ),
    { code: 'PDF_LIMIT' }
  );
  assert.equal(/[<>:"/\\|?*]/.test(quizPdfFilename('../quiz:test')), false);
});

test('embedded raster images retain aspect ratio without upscaling and their source URLs are not written into the document', () => {
  const src = {
    ...quiz,
    questions: [{ ...questions[0], imageUrl: 'https://example.test/figure.png' }],
  };
  const model = projectQuizPdf(src, null, { read: true, offlineExport: true }),
    doc = quizPdfDocument(model, {
      images: {
        'https://example.test/figure.png': {
          data: 'data:image/png;base64,test',
          width: 240,
          height: 100,
        },
      },
    });
  assert.deepEqual(doc.content.find((x) => x.image).fit, [180, 75]);
  assert.equal(JSON.stringify(doc).includes('https://example.test/figure.png'), false);
  assert.throws(
    () =>
      projectQuizPdf({ ...src, kind: 'cloud-custom', owner: null }, null, {
        read: true,
        offlineExport: true,
      }),
    { code: 'PDF_ACCESS' }
  );
});

test('correct choices are bold by original key across seven surfaces, including duplicate labels and unavailable legacy keys', () => {
  const duplicate = {
    ...questions[0],
    id: 'duplicate-label',
    options: { A: 'Identical text', B: 'Identical text' },
    answer: ['B'],
  };
  const unavailable = { ...duplicate, id: 'unavailable', answer: ['B', 'missing'] };
  const source = { ...quiz, questions: [...questions, duplicate, unavailable] },
    before = structuredClone(source);
  const model = projectQuizPdf(source, null, { read: true, offlineExport: true }),
    doc = quizPdfDocument(model);
  for (const [i, q] of model.questions.entries()) {
    const original = source.questions[i],
      known = q.answers !== null;
    const flags = q.parts.flatMap((part) =>
      part.choices.map(
        (choice) =>
          known &&
          (part.id ? original.answer[part.id] === choice.key : original.answer.includes(choice.key))
      )
    );
    const start = doc.content.findIndex((node) => node.text === i + 1 + '. Question ' + q.id);
    const next = doc.content.findIndex(
      (node, index) => index > start && (node.headlineLevel === 1 || node.pageBreak === 'before')
    );
    const rendered = doc.content
      .slice(start, next)
      .filter((node) => node.margin?.join(',') === '10,0,0,5');
    assert.deepEqual(
      rendered.map((node) => node.bold),
      flags
    );
  }
  assert.deepEqual(
    model.questions[7].parts[0].choices.map((c) => c.correct),
    [false, true]
  );
  assert.equal(
    model.questions[8].parts[0].choices.some((c) => c.correct),
    false
  );
  const key = doc.content.slice(doc.content.findIndex((node) => node.pageBreak === 'before') + 1);
  assert.equal(
    key
      .filter(
        (node) =>
          node.margin?.join(',') === '10,0,0,4' &&
          node.text !== 'Answer unavailable in the supplied quiz.'
      )
      .every((node) => node.bold === true),
    true
  );
  assert.deepEqual(source, before);
});
