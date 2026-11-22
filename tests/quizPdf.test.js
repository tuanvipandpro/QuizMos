import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import pdfMake from 'pdfmake/build/pdfmake.js';
import fonts from 'pdfmake/build/vfs_fonts.js';
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
const answerKeyIndex = (doc) => doc.content.findIndex((node) => node.id === 'pdf-answer-key');

async function renderPageLines(document) {
  pdfMake.addVirtualFileSystem(fonts);
  const pages = await new Promise((resolve) => pdfMake.createPdf(document)._getPages({}, resolve));
  return pages.map(({ items }) =>
    items
      .filter((entry) => entry.type === 'line')
      .map(({ item }) => item.inlines.map(({ text }) => text).join(''))
  );
}

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
  assert.ok(answerKeyIndex(doc) > 0);
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
      (node, index) => index > start && (node.headlineLevel === 1 || node.id === 'pdf-answer-key')
    );
    const rendered = doc.content
      .slice(start, next)
      .flatMap((node) => node.stack || [node])
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
  const key = doc.content.slice(answerKeyIndex(doc) + 1);
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

test('the seven-format private export keeps its final slot together and uses the continuation page for the answer key', async () => {
  const privateQuiz = {
    kind: 'cloud-custom',
    owner: 'pdf-owner',
    name: 'PDF QA 158',
    questions: questions.map((q, i) => ({
      ...q,
      id: 'pdfqa158-' + (i + 1),
      question: 'PDF QA ' + (i + 1) + ' — tiếng Việt. ' + q.question,
    })),
  };
  const model = projectQuizPdf(privateQuiz, 'pdf-owner', quizPdfAccess(privateQuiz, 'pdf-owner'));
  const pages = await renderPageLines(quizPdfDocument(model));
  assert.equal(pages.length, 3);
  assert.ok(pages[1].includes('First message [first]'));
  assert.deepEqual(pages[2].slice(0, 3), ['Second message [second]', 'A. start', 'B. finish']);
  assert.ok(pages[2].indexOf('Answer key') > 2);
  assert.ok(pages[2].includes('Second message [second]: B. finish'));
});

test('oversized structured options continue onto later pages without dropping text', async () => {
  const model = projectQuizPdf(quiz, null, quizPdfAccess(quiz, null));
  const lastPart = model.questions.at(-1).parts.at(-1);
  const lines = Array.from({ length: 120 }, (_, i) => 'Continuation QA line ' + (i + 1));
  lastPart.choices[1].text = lines.join('\n');
  const pages = await renderPageLines(quizPdfDocument(model));
  const output = pages.flat();
  const keyStart = output.indexOf('Answer key');
  assert.ok(keyStart > 0);
  const rendered = output
    .slice(0, keyStart)
    .map((line) => line.replace(/^B\. /, ''))
    .filter((line) => line.startsWith('Continuation QA line'));
  assert.deepEqual(rendered, lines);
  assert.ok(
    pages.filter((page) => page.some((line) => line.includes('Continuation QA line'))).length > 1
  );
});
