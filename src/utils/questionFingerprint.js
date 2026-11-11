import { isStructuredQuestion } from './questionModel.js';
import { contentHash } from './contentHash.js';

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
// Map key order is not content. Array order remains meaningful to callers.
export const orderObjectKeys = (value) =>
  Array.isArray(value)
    ? value.map(orderObjectKeys)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.keys(value)
            .sort(compare)
            .map((key) => [key, orderObjectKeys(value[key])])
        )
      : value;

export async function fingerprintQuestions(questions) {
  const records = questions
    .map((question) =>
      isStructuredQuestion(question)
        ? orderObjectKeys({
            id: String(question.id),
            type: question.type,
            question: question.question,
            options: question.options,
            answer: question.answer,
            imageUrl: question.imageUrl || '',
            layout: question.layout || '',
            instruction: question.instruction || '',
            template: question.template || '',
            statements: question.statements || [],
            slots: question.slots || [],
          })
        : {
            id: String(question.id),
            question: question.question,
            options: Object.fromEntries(
              Object.entries(question.options).sort(([a], [b]) => compare(a, b))
            ),
            answer: question.answer.map(String).sort(compare),
            imageUrl: question.imageUrl || '',
          }
    )
    .sort((a, b) => compare(a.id, b.id));
  return contentHash(JSON.stringify(records));
}
