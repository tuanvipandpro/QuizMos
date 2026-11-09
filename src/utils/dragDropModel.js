import { partOptions, questionParts } from './questionModel.js';

export function dragDropChoices(question) {
  const choices = new Map();
  for (const part of questionParts(question))
    for (const [key, text] of Object.entries(partOptions(question, part.id))) {
      const id = JSON.stringify([key, text]);
      if (!choices.has(id)) choices.set(id, { id, key, text });
    }
  return [...choices.values()];
}

export function normalizeDragAnswer(question, answer) {
  const current = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
  return Object.fromEntries(
    questionParts(question)
      .filter(
        (part) =>
          Object.hasOwn(current, part.id) &&
          typeof current[part.id] === 'string' &&
          Object.hasOwn(partOptions(question, part.id), current[part.id])
      )
      .map((part) => [part.id, current[part.id]])
  );
}

export function canPlaceDragChoice(question, choice, slotId) {
  const part = questionParts(question).find((item) => item.id === slotId);
  return (
    !!part &&
    !!choice &&
    typeof choice.key === 'string' &&
    Object.hasOwn(partOptions(question, slotId), choice.key) &&
    partOptions(question, slotId)[choice.key] === choice.text
  );
}

export function placeDragChoice(question, answer, selection, slotId) {
  if (!canPlaceDragChoice(question, selection?.choice, slotId)) return null;
  const next = normalizeDragAnswer(question, answer);
  if (selection.fromSlot != null) {
    if (
      !canPlaceDragChoice(question, selection.choice, selection.fromSlot) ||
      next[selection.fromSlot] !== selection.choice.key
    )
      return null;
    if (selection.fromSlot !== slotId) delete next[selection.fromSlot];
  }
  return { ...next, [slotId]: selection.choice.key };
}

export function clearDragSlot(question, answer, slotId) {
  const next = normalizeDragAnswer(question, answer);
  delete next[slotId];
  return next;
}
