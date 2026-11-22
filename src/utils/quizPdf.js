import { findQuiz } from '../data/quizzes.js';
import {
  validateQuizQuestions,
  isStructuredQuestion,
  questionParts,
  partOptions,
  partLabel,
  formatAnswerLines,
} from './questionModel.js';
import { PDF_LIMITS, pdfExportError } from '../data/pdfExportLimits.js';
export function quizPdfAccess(quiz, uid) {
  if (!quiz || quiz.invalid) return { read: false, offlineExport: false };
  if (quiz.kind === 'cloud-custom' && !uid) return { read: false, offlineExport: false };
  const read =
    quiz.kind === 'bank'
      ? !!findQuiz(quiz.id)
      : ['cloud-custom', 'tab-upload'].includes(quiz.kind) && quiz.owner === (uid || null);
  return { read, offlineExport: read };
}
export function assertPdfAccess(quiz, uid, access) {
  const own = quizPdfAccess(quiz, uid);
  if (!own.read || access?.read !== true || access?.offlineExport !== true)
    throw pdfExportError('ACCESS');
}
export function quizPdfFilename(title) {
  const clean =
    String(title || 'Quiz')
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\p{Cc}/gu, '-')
      .replace(/\.+$/, '')
      .trim()
      .slice(0, 100) || 'Quiz';
  return 'QuizMos-' + clean + '.pdf';
}
export function projectQuizPdf(quiz, uid, access) {
  assertPdfAccess(quiz, uid, access);
  if (!Array.isArray(quiz.questions) || quiz.questions.length > PDF_LIMITS.questions)
    throw pdfExportError('LIMIT');
  try {
    validateQuizQuestions(quiz.questions, { allowLegacyIncomplete: true });
  } catch {
    throw pdfExportError('INVALID');
  }
  const questions = quiz.questions.map((q) => {
    let available = true;
    try {
      validateQuizQuestions([q]);
    } catch {
      available = false;
    }
    const parts = isStructuredQuestion(q)
      ? questionParts(q).map((part, i) => ({
          id: part.id,
          label: partLabel(part, i),
          choices: Object.entries(partOptions(q, part.id))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, text]) => ({ key, text, correct: available && q.answer[part.id] === key })),
        }))
      : [
          {
            id: null,
            label: null,
            choices: Object.entries(q.options)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, text]) => ({ key, text, correct: available && q.answer.includes(key) })),
          },
        ];
    const answers = available
      ? isStructuredQuestion(q)
        ? questionParts(q).map(
            (part, i) =>
              partLabel(part, i) +
              ' [' +
              part.id +
              ']: ' +
              q.answer[part.id] +
              '. ' +
              partOptions(q, part.id)[q.answer[part.id]]
          )
        : formatAnswerLines(q, q.answer, { showKeys: true })
      : null;
    return {
      id: String(q.id),
      stem: q.question,
      instruction: q.instruction || '',
      template: q.template || '',
      imageUrl: q.imageUrl?.trim() || '',
      parts,
      answers,
    };
  });
  const projected = { title: quiz.name || quiz.title || 'Quiz', questions };
  if (
    new TextEncoder().encode(JSON.stringify(projected)).length > PDF_LIMITS.textBytes ||
    new Set(questions.map((q) => q.imageUrl).filter(Boolean)).size > PDF_LIMITS.images
  )
    throw pdfExportError('LIMIT');
  return projected;
}
export function quizPdfDocument(model, { t = (key) => key, images = {} } = {}) {
  const slotBoundaries = new Map();
  const content = [
    { text: model.title, style: 'title' },
    { text: 'QuizMos · ' + t('Questions and answers'), margin: [0, 0, 0, 18] },
  ];
  for (const [i, q] of model.questions.entries()) {
    content.push(
      { text: i + 1 + '. ' + t('Question') + ' ' + q.id, style: 'question', headlineLevel: 1 },
      { text: q.stem, margin: [0, 0, 0, 8] }
    );
    if (q.instruction) content.push({ text: q.instruction, italics: true, margin: [0, 0, 0, 6] });
    if (q.imageUrl) {
      if (!Object.hasOwn(images, q.imageUrl)) throw pdfExportError('IMAGE');
      const asset = images[q.imageUrl];
      content.push({
        image: asset.data,
        fit: [Math.min(490, asset.width * 0.75), Math.min(420, asset.height * 0.75)],
        margin: [0, 0, 0, 8],
      });
    }
    if (q.template)
      content.push({ text: q.template, fontSize: 9, background: '#f1f3f5', margin: [8, 6, 8, 10] });
    const partPrefix = 'pdf-part-' + i + '-';
    for (const [partIndex, part] of q.parts.entries()) {
      const choices = part.choices.map((choice) => ({
        text: choice.key + '. ' + choice.text,
        bold: choice.correct,
        margin: [10, 0, 0, 5],
      }));
      if (!part.id) {
        content.push(...choices);
        continue;
      }
      const id = partPrefix + partIndex;
      slotBoundaries.set(id, partPrefix + (partIndex + 1));
      content.push({
        id,
        stack: [
          { text: part.label + ' [' + part.id + ']', bold: true, margin: [0, 5, 0, 4] },
          ...choices,
        ],
      });
    }
    content.push({ id: partPrefix + q.parts.length, text: ' ', margin: [0, 0, 0, 6] });
  }
  content.push({
    id: 'pdf-answer-key',
    text: t('Answer key'),
    style: 'title',
    margin: [0, 18, 0, 12],
  });
  for (const [i, q] of model.questions.entries())
    content.push(
      { text: i + 1 + '. ' + t('Question') + ' ' + q.id, bold: true, margin: [0, 8, 0, 4] },
      ...(q.answers || [t('Answer unavailable in the supplied quiz.')]).map((text) => ({
        text,
        bold: !!q.answers,
        margin: [10, 0, 0, 4],
      }))
    );
  return {
    info: { title: model.title, author: 'QuizMos' },
    pageSize: 'A4',
    pageMargins: [42, 44, 42, 44],
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.25 },
    styles: {
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 12] },
      question: { fontSize: 12, bold: true, margin: [0, 12, 0, 6] },
    },
    content,
    footer: (page, count) => ({
      text: 'QuizMos · ' + page + ' / ' + count,
      alignment: 'center',
      fontSize: 8,
      margin: [0, 14, 0, 0],
    }),
    pageBreakBefore: (current, following, nextPage) => {
      if (current.id === 'pdf-answer-key') return following.length < 2;
      if (current.headlineLevel === 1) return following.length === 0;
      const boundaryId = slotBoundaries.get(current.id);
      if (!boundaryId || current.pageNumbers.length !== 2) return false;
      const boundary = nextPage.find(
        (node) => node.id === boundaryId && node.startPosition.pageNumber === current.pageNumbers[1]
      );
      // A slot fits if its continuation uses less space than the space above its start.
      // Leave the stack breakable so a long option can still flow without losing content.
      return Boolean(
        boundary && boundary.startPosition.verticalRatio < current.startPosition.verticalRatio
      );
    },
  };
}
