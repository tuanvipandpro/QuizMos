export const QUIZ_UPDATES_SEEN_KEY = 'quiz-updates-seen-v1';
const valid = (ids) =>
  Array.isArray(ids) &&
  ids.length <= 1000 &&
  ids.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 120);
export function quizUpdateStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
export function readSeenQuizUpdates(storage) {
  try {
    const ids = JSON.parse(storage?.getItem(QUIZ_UPDATES_SEEN_KEY) || '[]');
    return valid(ids) ? [...new Set(ids)] : [];
  } catch {
    return [];
  }
}
export function saveSeenQuizUpdates(ids, storage) {
  if (
    !Array.isArray(ids) ||
    !ids.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 120)
  )
    return false;
  const value = [...new Set(ids)].slice(-1000);
  if (!valid(value)) return false;
  try {
    if (!storage) return false;
    storage.setItem(QUIZ_UPDATES_SEEN_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
